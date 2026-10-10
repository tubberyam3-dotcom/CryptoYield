import { and, eq, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import { jointAccounts, jointAccountJoinRequests, userJointAccounts, users } from "@shared/schema";

export async function requestJointAccountJoin(userId: string, joinCode: string) {
  return db.transaction(async tx => {
    const [joint] = await tx.select().from(jointAccounts)
      .where(eq(jointAccounts.joinCode, joinCode.trim().toUpperCase())).for("update");
    if (!joint) throw new Error("Invalid join code");
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new Error("User not found");
    const [membership] = await tx.select().from(userJointAccounts).where(eq(userJointAccounts.userId, userId));
    if (membership) throw new Error("You already belong to a joint account.");
    const members = await tx.select().from(userJointAccounts).where(eq(userJointAccounts.jointAccountId, joint.id));
    if (members.length >= 2) throw new Error("This joint account already has both members.");
    const [pending] = await tx.select().from(jointAccountJoinRequests).where(and(
      eq(jointAccountJoinRequests.requesterId, userId), eq(jointAccountJoinRequests.status, "pending"),
    ));
    if (pending) {
      if (pending.jointAccountId === joint.id) return pending;
      throw new Error("You already have a pending joint-account join request. Wait for admin review.");
    }
    const [request] = await tx.insert(jointAccountJoinRequests).values({
      requesterId: userId, jointAccountId: joint.id,
    }).returning();
    return request;
  });
}

export async function listUserJoinRequests(userId: string) {
  return db.select({
    id: jointAccountJoinRequests.id, status: jointAccountJoinRequests.status,
    createdAt: jointAccountJoinRequests.createdAt, reviewedAt: jointAccountJoinRequests.reviewedAt,
    jointAccountName: jointAccounts.name,
  }).from(jointAccountJoinRequests)
    .innerJoin(jointAccounts, eq(jointAccounts.id, jointAccountJoinRequests.jointAccountId))
    .where(eq(jointAccountJoinRequests.requesterId, userId)).orderBy(desc(jointAccountJoinRequests.createdAt));
}

export async function listAdminJoinRequests() {
  const owner = alias(users, "joint_join_owner");
  return db.select({
    id: jointAccountJoinRequests.id, status: jointAccountJoinRequests.status,
    createdAt: jointAccountJoinRequests.createdAt, reviewedAt: jointAccountJoinRequests.reviewedAt,
    jointAccountId: jointAccountJoinRequests.jointAccountId,
    requesterId: users.id, requesterFirstName: users.firstName,
    requesterLastName: users.lastName, requesterEmail: users.email,
    jointAccountName: jointAccounts.name, ownerFirstName: owner.firstName,
    ownerLastName: owner.lastName, ownerEmail: owner.email,
  }).from(jointAccountJoinRequests)
    .innerJoin(users, eq(users.id, jointAccountJoinRequests.requesterId))
    .innerJoin(jointAccounts, eq(jointAccounts.id, jointAccountJoinRequests.jointAccountId))
    .innerJoin(owner, eq(owner.id, jointAccounts.createdBy))
    .orderBy(desc(jointAccountJoinRequests.createdAt));
}

export async function reviewJointAccountJoin(requestId: string, adminId: string, status: "approved" | "rejected") {
  return db.transaction(async tx => {
    const [initial] = await tx.select().from(jointAccountJoinRequests).where(eq(jointAccountJoinRequests.id, requestId));
    if (!initial) throw new Error("Join request not found");
    // Match shared-funds lock order: joint account first, then members.
    const [joint] = await tx.select().from(jointAccounts).where(eq(jointAccounts.id, initial.jointAccountId)).for("update");
    if (!joint) throw new Error("Joint account not found");
    const [request] = await tx.select().from(jointAccountJoinRequests).where(eq(jointAccountJoinRequests.id, requestId)).for("update");
    if (!request || request.status !== "pending") throw new Error("This join request has already been reviewed.");
    const [admin] = await tx.select().from(users).where(eq(users.id, adminId));
    if (admin?.role !== "admin") throw new Error("Administrator approval is required.");
    if (status === "approved") {
      const members = await tx.select().from(userJointAccounts).where(eq(userJointAccounts.jointAccountId, joint.id));
      await tx.select().from(users)
        .where(inArray(users.id, [...members.map(member => member.userId), request.requesterId]))
        .orderBy(users.id).for("update");
      const [membership] = await tx.select().from(userJointAccounts).where(eq(userJointAccounts.userId, request.requesterId));
      if (membership) throw new Error("The requesting user already belongs to a joint account.");
      if (members.length >= 2) throw new Error("This joint account already has both members. Reject this request.");
      await tx.insert(userJointAccounts).values({
        userId: request.requesterId, jointAccountId: joint.id, role: "partner",
      });
      await tx.update(users).set({ accountType: "joint", updatedAt: new Date() }).where(eq(users.id, request.requesterId));
    }
    const [reviewed] = await tx.update(jointAccountJoinRequests).set({
      status, reviewedBy: adminId, reviewedAt: new Date(),
    }).where(eq(jointAccountJoinRequests.id, requestId)).returning();
    return reviewed;
  });
}
