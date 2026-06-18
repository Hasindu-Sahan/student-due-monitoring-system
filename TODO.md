# TODO - Welfare & Faculty dashboard Not Paid fix

## Step 1: Understand current logic
- [x] Located dashboard counts in `src/components/portal/office-portal.tsx`.
- [x] Confirmed current Not Paid uses: `pending + rejected + !bankSlipUrl`.

## Step 2: Get receivers count data
- [ ] Add/extend an API endpoint to return `receiversCount` for the dashboard scope + filters.
  - receiversCount should be computed as: total receivers assigned in fee management.

## Step 3: Update dashboard formulas
- [ ] Update `office-portal.tsx` to use:
  - `Not Paid = receiversCount - approvedCount`
  - where `approvedCount` is count of latest payments with status `Approved`.

## Step 4: Validate
- [ ] Build and/or run lint checks.
- [ ] Verify Welfare + all Faculty office dashboards show correct Not Paid.

