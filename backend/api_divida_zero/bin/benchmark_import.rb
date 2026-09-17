#!/usr/bin/env ruby
# frozen_string_literal: true

# Benchmark script for OFX/CSV import performance
# Usage: ruby bin/benchmark_import.rb [ofx|csv] [iterations]

require_relative '../config/environment'
require 'benchmark'

iterations = ARGV[1]&.to_i || 5
format = ARGV[0] || 'ofx'

unless %w[ofx csv].include?(format)
  puts "Usage: ruby bin/benchmark_import.rb [ofx|csv] [iterations]"
  exit 1
end

puts "=== Import Benchmark: #{format.upcase} ==="
puts "Iterations: #{iterations}"
puts

file_path = "test/fixtures/files/sample.#{format}"
unless File.exist?(file_path)
  puts "Fixture file not found: #{file_path}"
  exit 1
end

# Create a test user
user = User.create!(
  name: 'Benchmark User',
  email: "benchmark_#{Time.current.to_i}@test.com",
  password: 'password123',
  password_confirmation: 'password123'
)

connection = FinancialConnection.create!(
  user: user,
  provider: :manual,
  provider_item_id: "benchmark_#{SecureRandom.hex(8)}",
  provider_institution_id: 'manual_upload',
  metadata: { file_path: file_path, format: format }
)

puts "Testing with file: #{file_path}"
puts "File size: #{File.size(file_path)} bytes"
puts

# Benchmark parse
parse_times = []
iterations.times do
  parser = format == 'csv' ? Bank::CsvParser.new : Bank::OfxParser.new
  time = Benchmark.measure { parser.parse(file_path) }
  parse_times << time.real
end

puts "=== Parse Benchmark ==="
puts "  Avg: #{(parse_times.sum / iterations * 1000).round(2)}ms"
puts "  Min: #{(parse_times.min * 1000).round(2)}ms"
puts "  Max: #{(parse_times.max * 1000).round(2)}ms"
puts

# Benchmark full sync
sync_times = []
iterations.times do
  connection = FinancialConnection.create!(
    user: user,
    provider: :manual,
    provider_item_id: "benchmark_#{SecureRandom.hex(8)}",
    provider_institution_id: 'manual_upload',
    metadata: { file_path: file_path, format: format }
  )

  time = Benchmark.measure do
    FinancialSyncJob.perform_now(financial_connection_id: connection.id, sync_type: :manual_upload)
  end
  sync_times << time.real
end

puts "=== Full Sync Benchmark ==="
puts "  Avg: #{(sync_times.sum / iterations * 1000).round(2)}ms"
puts "  Min: #{(sync_times.min * 1000).round(2)}ms"
puts "  Max: #{(sync_times.max * 1000).round(2)}ms"
puts

# Cleanup
user.destroy

puts "=== Summary ==="
puts "Format: #{format.upcase}"
puts "Parse: #{(parse_times.sum / iterations * 1000).round(2)}ms avg"
puts "Full Sync: #{(sync_times.sum / iterations * 1000).round(2)}ms avg"

# Check against targets
parse_avg = parse_times.sum / iterations
sync_avg = sync_times.sum / iterations

puts
puts "=== Targets ==="
if format == 'ofx'
  puts "OFX Parse: #{parse_avg < 1 ? '✅ PASS' : '❌ FAIL'} (< 1s)"
  puts "OFX Full Sync: #{sync_avg < 5 ? '✅ PASS' : '❌ FAIL'} (< 5s)"
else
  puts "CSV Parse: #{parse_avg < 0.5 ? '✅ PASS' : '❌ FAIL'} (< 0.5s)"
  puts "CSV Full Sync: #{sync_avg < 3 ? '✅ PASS' : '❌ FAIL'} (< 3s)"
end