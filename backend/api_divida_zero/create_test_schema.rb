content = File.read('db/schema.rb')
content = content.gsub('t.jsonb', 't.json')
content = content.gsub('enable_extension "pg_catalog.plpgsql"', '')
File.write('db/test_schema.rb', content)
puts 'Test schema created'