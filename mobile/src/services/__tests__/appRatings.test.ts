import api from '../api';
import { createAppRating, getAppRatingsSummary, listMyAppRatings } from '../appRatings';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('appRatings service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates app rating with payload and returns normalized response', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { id: 15, message: 'ok', created_at: '2026-04-09T10:00:00Z' },
    });

    const result = await createAppRating({
      usability_rating: 5,
      helpfulness_rating: 4,
      calendar_rating: 5,
      alerts_rating: 4,
      goals_rating: 5,
      reports_rating: 4,
      records_rating: 5,
      suggestions: 'Muito bom',
    });

    expect(api.post).toHaveBeenCalledWith('/app_ratings', expect.objectContaining({ usability_rating: 5 }));
    expect(result).toEqual({
      id: 15,
      message: 'ok',
      created_at: '2026-04-09T10:00:00Z',
    });
  });

  it('lists my app ratings with default limit', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        ratings: [{ id: 1, usability_rating: 5 }],
      },
    });

    const result = await listMyAppRatings();

    expect(api.get).toHaveBeenCalledWith('/app_ratings/me', { params: { limit: 20 } });
    expect(result).toHaveLength(1);
  });

  it('returns normalized summary values', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        total_responses: 3,
        averages: {
          usability: 4.33,
          helpfulness: 4,
          calendar: 3.5,
          alerts: 4.9,
          goals: 5,
          reports: 4.2,
          records: 4.6,
        },
      },
    });

    const summary = await getAppRatingsSummary();

    expect(api.get).toHaveBeenCalledWith('/app_ratings/summary');
    expect(summary.total_responses).toBe(3);
    expect(summary.averages.usability).toBe(4.33);
    expect(summary.averages.records).toBe(4.6);
  });
});
