ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # In CI, keep test DB access deterministic for PostgreSQL.
    if ENV["CI"] == "true"
      parallelize(workers: ENV.fetch("PARALLEL_WORKERS", "1").to_i, with: :processes)
    else
      parallelize(workers: :number_of_processors, with: :threads)
    end

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end
