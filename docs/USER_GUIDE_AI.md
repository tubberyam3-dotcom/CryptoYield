# Reflux Capital - User Guide for AI Agents

This documentation provides structured information about all user flows in the Reflux Capital investment platform. It is designed to be consumed by AI agents to assist users with platform operations.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Account Management](#account-management)
3. [Wallet & Balance](#wallet--balance)
4. [Deposits](#deposits)
5. [Withdrawals](#withdrawals)
6. [Portfolio Investments](#portfolio-investments)
7. [Bond Investments](#bond-investments)
8. [Stock Trading](#stock-trading)
9. [Daily Rewards & XP](#daily-rewards--xp)
10. [Community Challenges](#community-challenges)
11. [Joint Accounts](#joint-accounts)
12. [Transaction History](#transaction-history)

---

## Platform Overview

### Summary
Reflux Capital is an investment brokerage platform where users can:
- Invest in curated portfolios (stocks, ETFs, mutual funds)
- Purchase bonds (government, corporate, municipal)
- Buy and sell individual stocks (admin-approved)
- Earn daily rewards and XP bonuses
- Participate in community investment challenges
- Manage wallet balances for deposits and withdrawals

### Authentication Requirements
- All investment actions require user authentication
- New accounts require KYC approval before trading
- Approved status is required for most transactions

### Key Terminology
| Term | Definition |
|------|------------|
| Balance | Cash available in user's wallet for investments |
| XP Balance | Experience points earned through platform activity |
| KYC Status | Know Your Customer verification status (pending/approved/rejected) |
| Portfolio | Curated collection of stocks/ETFs with specific investment strategy |
| Bond | Fixed-income investment product with guaranteed yields |

---

## Account Management

### Registration Flow

**Preconditions:** None

**Steps:**
1. Navigate to landing page
2. Click "Get Started" or "Sign Up"
3. Fill registration form:
   - Email address
   - Password (min 8 characters)
   - First name
   - Last name
4. Submit registration
5. Account is created with "pending" KYC status
6. Wait for admin approval email

**API Endpoint:** `POST /api/auth/register`

**Payload:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Post-Registration:**
- New accounts start with $0.00 balance
- User receives "Account Pending" email notification
- Admin must approve account before trading is enabled
- Upon approval, user receives "Account Approved" email

### Login Flow

**Methods:**
1. **Password Login:** Email + password
2. **XP Code Login:** One-time PIN code (for verified users)
3. **Replit OAuth:** SSO login via Replit account

**API Endpoint:** `POST /api/auth/login`

**Payload:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Password Reset

**Steps:**
1. Click "Forgot Password" on login page
2. Enter email address
3. Receive password reset email with link
4. Click link (valid for 1 hour)
5. Enter new password
6. Password updated

**API Endpoints:**
- Request reset: `POST /api/auth/forgot-password`
- Complete reset: `POST /api/auth/reset-password`

---

## Wallet & Balance

### Viewing Balance

**Navigation:** Dashboard → Wallet section (sidebar)

**API Endpoint:** `GET /api/dashboard/stats`

**Response includes:**
```json
{
  "availableBalance": "1000.00",
  "totalPortfolioValue": "5000.00",
  "activeBonds": "2000.00",
  "activeChallenges": 2
}
```

### Balance Components
| Component | Description |
|-----------|-------------|
| Available Balance | Cash ready for investment |
| Portfolio Value | Total value of portfolio investments |
| Bond Holdings | Total value of active bonds |
| Total Assets | Sum of all above |

---

## Deposits

### Deposit Methods

| Method | Description | Processing Time |
|--------|-------------|-----------------|
| Crypto | Deposit via cryptocurrency | Instant after confirmation |
| Bank Transfer | Wire transfer from bank | 1-3 business days |
| Card Payment | Credit/debit card | Requires admin approval |
| Deposit Coupon | Promotional coupon code | Instant after approval |

### Making a Deposit

**Navigation:** Dashboard → Wallet → "Deposit" button

**Preconditions:**
- User must be logged in
- Account should be approved (recommended)

**Steps:**
1. Click "Deposit" button in wallet
2. Select deposit method
3. Enter deposit amount
4. Provide method-specific details:
   - **Crypto:** Transaction hash/ID
   - **Bank Transfer:** Reference number
   - **Card:** Transaction ID
   - **Coupon:** Coupon code
5. Submit deposit request
6. Wait for admin approval (if required)

**API Endpoints:**

**Crypto Deposit:**
```
POST /api/deposits/crypto
{
  "amount": "500.00",
  "transactionId": "0x123abc..."
}
```

**Bank Transfer:**
```
POST /api/deposits/bank-transfer
{
  "amount": "1000.00",
  "transactionId": "REF123456"
}
```

**Card Payment:**
```
POST /api/deposits/card-payment
{
  "amount": "250.00",
  "transactionId": "ch_stripe_id"
}
```

**Coupon Deposit:**
```
POST /api/deposits/coupon
{
  "couponCode": "WELCOME100"
}
```

### Deposit Status Flow
```
pending → completed (approved)
pending → failed (rejected)
pending → cancelled
```

### View Deposit History

**API Endpoint:** `GET /api/deposits`

**Response:**
```json
[
  {
    "id": "dep_123",
    "amount": "500.00",
    "depositMethod": "crypto",
    "status": "completed",
    "createdAt": "2025-01-10T10:00:00Z"
  }
]
```

---

## Withdrawals

### Withdrawal Methods

| Method | Description | Processing Time |
|--------|-------------|-----------------|
| Crypto | Withdraw to crypto wallet | 1-2 business days |
| Wire Transfer | Bank wire transfer | 3-5 business days |
| Merchant Pay | Payment to merchant account | 1-3 business days |

### Making a Withdrawal

**Navigation:** Dashboard → Wallet → "Withdraw" button

**Preconditions:**
- User must be logged in
- Account must be approved
- Sufficient available balance
- Balance ≥ withdrawal amount

**Steps:**
1. Click "Withdraw" button in wallet
2. Select withdrawal method
3. Enter withdrawal amount
4. Provide destination details:
   - **Crypto:** Wallet address
   - **Wire:** Bank account details
   - **Merchant:** Merchant account ID
5. Submit withdrawal request
6. Wait for admin processing

**API Endpoint:**
```
POST /api/withdrawals
{
  "amount": "200.00",
  "withdrawMethod": "crypto",
  "destinationAddress": "0xabc123..."
}
```

### Withdrawal Status Flow
```
pending → completed (processed)
pending → rejected
pending → cancelled
```

### View Withdrawal History

**API Endpoint:** `GET /api/withdrawals`

---

## Portfolio Investments

### Understanding Portfolios

Portfolios are curated collections of investments managed by Reflux Capital. Each portfolio has:
- **Strategy:** Growth, Income, Balanced, Aggressive, etc.
- **Risk Level:** 1 (low) to 5 (high)
- **Minimum Investment:** Required starting amount
- **Expected Return:** Historical/projected annual return

### Browse Portfolios

**Navigation:** Dashboard → Portfolios (sidebar)

**API Endpoint:** `GET /api/portfolios`

**Response:**
```json
[
  {
    "id": "port_123",
    "name": "AI Revolution Portfolio",
    "description": "Focused on AI and tech companies",
    "minimumInvestment": "500.00",
    "expectedReturn": "12.5",
    "riskLevel": 3,
    "strategy": "growth",
    "isActive": true
  }
]
```

### Invest in Portfolio

**Preconditions:**
- User logged in and approved
- Available balance ≥ investment amount
- Investment amount ≥ portfolio minimum

**Steps:**
1. Navigate to Portfolios page
2. Select desired portfolio
3. Click "Invest" button
4. Enter investment amount
5. Confirm investment
6. Balance deducted, investment recorded

**API Endpoint:**
```
POST /api/portfolios/{portfolioId}/invest
{
  "amount": "1000.00"
}
```

### View My Portfolios

**API Endpoint:** `GET /api/user/portfolios`

**Response:**
```json
[
  {
    "id": "up_123",
    "portfolioId": "port_123",
    "investedAmount": "1000.00",
    "currentValue": "1125.00",
    "returnPercentage": "12.5",
    "createdAt": "2025-01-01T00:00:00Z",
    "portfolio": {
      "name": "AI Revolution Portfolio"
    }
  }
]
```

---

## Bond Investments

### Understanding Bonds

Bonds are fixed-income investments with:
- **Type:** Government, Corporate, or Municipal
- **Yield Rate:** Annual percentage return
- **Maturity Period:** Duration in months
- **Minimum Investment:** Required starting amount

### Browse Bonds

**Navigation:** Dashboard → Bonds (sidebar)

**API Endpoint:** `GET /api/bond-products`

**Response:**
```json
[
  {
    "id": "bond_123",
    "name": "US Treasury 5-Year",
    "type": "government",
    "yieldRate": "4.5",
    "maturityMonths": 60,
    "minimumInvestment": "1000.00",
    "isActive": true
  }
]
```

### Purchase Bond

**Preconditions:**
- User logged in and approved
- Available balance ≥ investment amount
- Investment amount ≥ bond minimum

**Steps:**
1. Navigate to Bonds page
2. Select desired bond product
3. Click "Invest" or "Purchase"
4. Enter investment amount
5. Confirm purchase
6. Balance deducted, bond recorded

**API Endpoint:**
```
POST /api/bond-products/{bondId}/invest
{
  "amount": "2000.00"
}
```

### View My Bonds

**API Endpoint:** `GET /api/user/bonds`

**Response:**
```json
[
  {
    "id": "ub_123",
    "bondProductId": "bond_123",
    "investedAmount": "2000.00",
    "expectedReturn": "2090.00",
    "maturityDate": "2030-01-10",
    "status": "active",
    "bondProduct": {
      "name": "US Treasury 5-Year",
      "yieldRate": "4.5"
    }
  }
]
```

---

## Stock Trading

### Understanding Stock Trading

Stock purchases on Reflux Capital require admin approval for security and compliance.

### Browse Stocks

**Navigation:** Dashboard → Stocks (sidebar)

**API Endpoint:** `GET /api/stocks`

Returns real-time stock data via Yahoo Finance integration.

### Purchase Stock

**Preconditions:**
- User logged in and approved
- Available balance ≥ total purchase cost
- Stock symbol must be valid

**Steps:**
1. Navigate to Stocks page
2. Search for stock by symbol
3. View current price and details
4. Enter quantity to purchase
5. Submit purchase request
6. Balance held pending approval
7. Wait for admin approval
8. Upon approval: shares added to portfolio
9. Upon rejection: balance refunded

**API Endpoint:**
```
POST /api/stocks/buy
{
  "symbol": "AAPL",
  "quantity": 10,
  "price": "175.50"
}
```

### Stock Status Flow
```
pending → approved (shares credited)
pending → rejected (balance refunded)
```

### View My Stocks

**API Endpoint:** `GET /api/user/stocks`

---

## Daily Rewards & XP

### Daily Bonus

**Description:** Users can claim a daily cash bonus of $100.

**Navigation:** Dashboard → Rewards (sidebar)

**Preconditions:**
- User logged in
- 24 hours since last claim
- Account approved

**Steps:**
1. Navigate to Rewards page
2. Click "Claim Daily Bonus" button
3. If eligible: $100 added to balance
4. If not eligible: Shows time until next claim

**API Endpoints:**

**Check Status:**
```
GET /api/rewards/daily-status
```
Response:
```json
{
  "canClaim": true,
  "nextClaimTime": null,
  "lastClaimTime": "2025-01-09T10:00:00Z"
}
```

**Claim Bonus:**
```
POST /api/rewards/redeem
```

### XP System

**Description:** Users earn XP through platform activities and can claim daily XP bonuses.

**XP Sources:**
| Activity | XP Earned |
|----------|-----------|
| Daily XP Claim | 50 XP |
| Portfolio Investment | Variable |
| Challenge Participation | Variable |
| Referrals | Variable |

**API Endpoints:**

**Claim Daily XP:**
```
POST /api/xp/claim
```

**Convert XP to Balance:**
```
POST /api/xp/convert
{
  "amount": 100
}
```
(Conversion rate: 100 XP = $1.00)

**View XP History:**
```
GET /api/xp/history
```

---

## Community Challenges

### Understanding Challenges

Challenges are group investment goals where users pool resources to reach targets together.

**Challenge Types:**
- **Group:** Multiple users contribute to shared goal
- **Solo:** Individual investment targets

### Browse Challenges

**Navigation:** Dashboard → Challenges (sidebar)

**API Endpoint:** `GET /api/challenges`

**Response:**
```json
[
  {
    "id": "chal_123",
    "name": "Tech Fund Challenge",
    "description": "Invest $100K collectively in tech",
    "targetAmount": "100000.00",
    "currentAmount": "75000.00",
    "status": "active",
    "startDate": "2025-01-01",
    "endDate": "2025-03-01"
  }
]
```

### Join Challenge

**Preconditions:**
- User logged in and approved
- Challenge is active
- User not already a member

**API Endpoint:**
```
POST /api/challenges/{challengeId}/join
```

### Contribute to Challenge

**Preconditions:**
- User is challenge member
- Available balance ≥ contribution amount

**API Endpoint:**
```
POST /api/challenges/{challengeId}/contribute
{
  "amount": "500.00"
}
```

---

## Joint Accounts

### Understanding Joint Accounts

Joint accounts allow two users to share investments and manage funds together.

### Create Joint Account

**Navigation:** Dashboard → Settings → Joint Accounts

**Steps:**
1. Navigate to Joint Accounts section
2. Click "Create Joint Account"
3. Enter account name
4. Receive unique join code
5. Share code with partner

**API Endpoint:**
```
POST /api/joint-accounts
{
  "name": "Family Investment Account"
}
```

**Response includes join code:**
```json
{
  "id": "ja_123",
  "name": "Family Investment Account",
  "joinCode": "ABC123XY",
  "status": "pending_partner"
}
```

### Join Existing Account

**Steps:**
1. Navigate to Joint Accounts section
2. Click "Join Account"
3. Enter join code from partner
4. Account linked

**API Endpoint:**
```
POST /api/joint-accounts/join
{
  "joinCode": "ABC123XY"
}
```

---

## Transaction History

### View All Transactions

**Navigation:** Dashboard → Transaction History (sidebar)

**API Endpoints:**
- Deposits: `GET /api/deposits`
- Withdrawals: `GET /api/withdrawals`
- Portfolio investments: `GET /api/user/portfolios`
- Bond purchases: `GET /api/user/bonds`
- Stock trades: `GET /api/user/stocks`

### Transaction Statuses

| Status | Description |
|--------|-------------|
| pending | Awaiting processing/approval |
| completed | Successfully processed |
| approved | Admin approved (for stocks) |
| rejected | Declined by admin |
| cancelled | Cancelled by user or system |
| failed | Processing failed |

---

## Error Handling

### Common Error Responses

| Status Code | Meaning | User Action |
|-------------|---------|-------------|
| 401 | Not authenticated | Log in again |
| 403 | Not authorized / KYC pending | Contact support or wait for approval |
| 400 | Invalid request | Check input data |
| 402 | Insufficient balance | Deposit more funds |
| 404 | Resource not found | Verify ID/reference |
| 500 | Server error | Try again later |

### Balance-Related Errors

```json
{
  "message": "Insufficient balance",
  "required": "1000.00",
  "available": "500.00"
}
```

---

## Email Notifications

Users receive email notifications for:

| Event | Email Subject |
|-------|---------------|
| Registration | "Account Created - Awaiting Approval" |
| Account Approved | "Account Approved - Welcome to Reflux Capital!" |
| Deposit Approved | "Deposit Approved - Reflux Capital" |
| Stock Purchase Approved | "Stock Purchase Approved - Reflux Capital" |
| Daily Rewards Claimed | "Daily Rewards Claimed - Reflux Capital" |
| Password Reset | "Password Reset Request - Reflux Capital" |

---

## Quick Reference - API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new account |
| POST | /api/auth/login | Login with password |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/user | Get current user |

### Wallet & Deposits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get balance and stats |
| GET | /api/deposits | List user deposits |
| POST | /api/deposits/crypto | Make crypto deposit |
| POST | /api/deposits/bank-transfer | Make bank deposit |
| POST | /api/deposits/card-payment | Make card deposit |
| POST | /api/deposits/coupon | Redeem coupon |

### Withdrawals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/withdrawals | List withdrawals |
| POST | /api/withdrawals | Request withdrawal |

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/portfolios | List portfolios |
| GET | /api/user/portfolios | Get my portfolios |
| POST | /api/portfolios/:id/invest | Invest in portfolio |
| GET | /api/bond-products | List bonds |
| GET | /api/user/bonds | Get my bonds |
| POST | /api/bond-products/:id/invest | Purchase bond |
| GET | /api/stocks | Search stocks |
| GET | /api/user/stocks | Get my stocks |
| POST | /api/stocks/buy | Buy stock |

### Rewards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rewards/daily-status | Check daily bonus status |
| POST | /api/rewards/redeem | Claim daily bonus |
| POST | /api/xp/claim | Claim daily XP |
| POST | /api/xp/convert | Convert XP to balance |
| GET | /api/xp/history | XP transaction history |

### Challenges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/challenges | List challenges |
| POST | /api/challenges/:id/join | Join challenge |
| POST | /api/challenges/:id/contribute | Contribute funds |

### Joint Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/joint-accounts | List my joint accounts |
| POST | /api/joint-accounts | Create joint account |
| POST | /api/joint-accounts/join | Join with code |

---

## AI Agent Instructions

When assisting users with Reflux Capital:

1. **Always verify authentication status** before attempting operations
2. **Check KYC approval status** - pending accounts have limited functionality
3. **Verify balance** before investment/withdrawal operations
4. **Use correct API endpoints** as documented above
5. **Handle errors gracefully** with clear user explanations
6. **Guide users through multi-step processes** like deposits and investments
7. **Explain waiting periods** for admin-approved operations (stocks, deposits)

### Common User Intents Mapping

| User Says | Likely Action |
|-----------|---------------|
| "Check my balance" | GET /api/dashboard/stats |
| "Deposit money" | Guide through deposit flow |
| "Buy stocks" | POST /api/stocks/buy |
| "Invest in portfolio" | POST /api/portfolios/:id/invest |
| "Claim rewards" | POST /api/rewards/redeem |
| "Withdraw funds" | POST /api/withdrawals |
| "See my investments" | GET /api/user/portfolios + /api/user/bonds |

---

*Documentation Version: 1.0*
*Platform: Reflux Capital*
*Last Updated: January 2025*
