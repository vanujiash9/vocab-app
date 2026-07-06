drop policy if exists "dictionary entries insert authenticated" on public.dictionary_entries;

create policy "dictionary entries insert authenticated"
on public.dictionary_entries
for insert
to authenticated
with check (
  btrim(coalesce(word, '')) <> ''
  and btrim(coalesce(normalized_word, '')) <> ''
  and normalized_word = lower(btrim(normalized_word))
  and provider = any (array['manual', 'dictionaryapi.dev', 'import-csv'])
);
