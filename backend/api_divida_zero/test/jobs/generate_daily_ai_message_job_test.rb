require "test_helper"

class GenerateDailyAiMessageJobTest < ActiveJob::TestCase
  test "creates one message per day" do
    date = Date.new(2026, 4, 9)
    generated = DailyAiMessage.create!(
      date: date,
      title: "Mensagem",
      body: "Texto diario",
      theme: "controle",
      source_version: "v1"
    )

    with_singleton_stub(Ai::DailyMessageGenerator, :generate_for, generated) do
      assert_no_difference("DailyAiMessage.count") do
        GenerateDailyAiMessageJob.perform_now(date.iso8601)
      end
    end
  end

  private

  def with_singleton_stub(target, method_name, return_value)
    singleton = class << target; self; end
    backup_method = "__codex_backup_#{method_name}_#{object_id}".to_sym

    singleton.send(:alias_method, backup_method, method_name)
    singleton.send(:define_method, method_name) do |*_args|
      return_value
    end

    yield
  ensure
    singleton.send(:remove_method, method_name) rescue nil
    singleton.send(:alias_method, method_name, backup_method) rescue nil
    singleton.send(:remove_method, backup_method) rescue nil
  end
end
