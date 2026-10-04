alter table cash_reconciliations add column if not exists expected_digital numeric(14,2);
alter table cash_reconciliations add column if not exists actual_digital numeric(14,2);
alter table cash_reconciliations add column if not exists digital_difference numeric(14,2);