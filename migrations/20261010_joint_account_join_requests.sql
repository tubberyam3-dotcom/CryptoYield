CREATE TABLE IF NOT EXISTS joint_account_join_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joint_account_id varchar NOT NULL REFERENCES joint_accounts(id) ON DELETE CASCADE,
  status varchar NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  reviewed_at timestamp,
  reviewed_by varchar REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT joint_join_valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);
CREATE UNIQUE INDEX IF NOT EXISTS joint_join_one_pending_per_user
  ON joint_account_join_requests(requester_id) WHERE status = 'pending';
