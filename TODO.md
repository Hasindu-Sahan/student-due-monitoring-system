# TODO - Admin Filters / Fees / Reports updates

## Step 1: Update Fee Management UI
- [ ] Add "none" option to all filter dropdowns/selects in admin fee management (value="none")
- [ ] Add "FOT" option to faculty dropdowns (Add + Edit sections)
- [ ] Remove Academic Year input from Add New Fee section
- [ ] Remove Academic Year input from Edit Current Fee section
- [ ] Remove "Academic Year" column from bottom fees table


## Step 2: Update Fees API to support "none" (empty selection)
- [ ] Interpret filters.faculty === "none" as faculty is null/empty (no faculty assigned)
- [ ] Interpret filters.level === "none" similarly if applicable (based on student.level)
- [ ] Ensure academicYear-related assignment is removed only if UI stops sending it (backend can keep academicYear logic, but UI won’t send it)

## Step 3: Update Reports UI
- [ ] Remove Academic Year filter UI
- [ ] Add new "Fee category" filter dropdown
- [ ] Add "none" option to all remaining filter dropdowns/selects
- [ ] Update resetFilters + filter state shape

## Step 4: Update Reports API
- [ ] Provide fee category options from feeType.category
- [ ] Filter report rows by feeType.category when selected
- [ ] Interpret "fee category" = "none" as category is null/empty
- [ ] Remove academicYear filtering from in-memory rows

## Step 5: Verify
- [ ] Run lint/build
- [ ] Manual UI verification: dropdown options, form fields, tables, report generation
