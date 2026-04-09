require "test_helper"

class GenerateDailyAiMessageJobTest < ActiveJob::TestCase
  test "creates one message per day" do
    date = Date.new(2026, 4, 9)

    Ai::DailyMessageGenerator.stub(:generate_for, DailyAiMessage.create!(
      date: date,
      title: "Mensagem",
      body: "Texto diario",
      theme: "controle",
      source_version: "v1"
    )) do
      assert_no_difference("DailyAiMessage.count") do
        GenerateDailyAiMessageJob.perform_now(date.iso8601)
      end
    end
  end
end
