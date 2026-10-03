-- Item-level sales are optional so existing income and expense transactions remain valid.
alter table transactions add column if not exists item_name text;
alter table transactions add column if not exists quantity integer;
alter table transactions add column if not exists unit_price numeric(14,2);
alter table transactions add constraint transactions_item_name_length
  check (item_name is null or char_length(item_name) between 1 and 100);
alter table transactions add constraint transactions_quantity_positive
  check (quantity is null or quantity > 0);
alter table transactions add constraint transactions_unit_price_positive
  check (unit_price is null or unit_price > 0);
create index if not exists transactions_item_sales_idx
  on transactions (cafe_id, item_name, created_at) where item_name is not null and deleted_at is null;