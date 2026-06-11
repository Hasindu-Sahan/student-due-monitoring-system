- [ ] Inspect how `StudentFee.status` is currently updated to `Overdue`
- [x] Implement auto-update on student dashboard fetch: in `src/app/api/student/fees/route.ts`, mark due fees as `Overdue` when `fee.dueDate < now` and status is not `Overdue`
- [ ] Recompute `totalOverdue` based on updated statuses
- [ ] Quick local sanity check: ensure API returns correct totals after a due date passes


