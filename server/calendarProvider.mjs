/**
 * Calendar Provider Abstraction
 * Provides:
 * - Extensible CalendarProvider interface
 * - Google Calendar OAuth 2.0 integration (authorization, code exchange, token refresh)
 * - Free/Busy availability querying
 * - Event creation with Google Meet video conferencing link
 * - Event rescheduling, cancellation, and synchronization
 * - Clearly labeled Demo Mode fallback when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured
 */

export class CalendarProvider {
  constructor(name = 'generic') {
    this.name = name;
    this.isDemoMode = false;
  }

  async getAuthorizationUrl(options) {
    throw new Error('getAuthorizationUrl must be implemented by provider.');
  }

  async exchangeCodeForTokens(options) {
    throw new Error('exchangeCodeForTokens must be implemented by provider.');
  }

  async refreshAccessToken(options) {
    throw new Error('refreshAccessToken must be implemented by provider.');
  }

  async listCalendars(options) {
    throw new Error('listCalendars must be implemented by provider.');
  }

  async getFreeBusy(options) {
    throw new Error('getFreeBusy must be implemented by provider.');
  }

  async createEvent(options) {
    throw new Error('createEvent must be implemented by provider.');
  }

  async updateEvent(options) {
    throw new Error('updateEvent must be implemented by provider.');
  }

  async cancelEvent(options) {
    throw new Error('cancelEvent must be implemented by provider.');
  }

  async getEvent(options) {
    throw new Error('getEvent must be implemented by provider.');
  }
}

export class GoogleCalendarProvider extends CalendarProvider {
  constructor(config = {}) {
    super('google');
    this.clientId = config.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    this.isDemoMode = !this.clientId || !this.clientSecret;

    // Minimum required Google Calendar OAuth scopes
    this.scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    // In-memory mock store for demo mode events & accounts
    this.demoEvents = new Map();
    this.demoBusyBlocks = [
      // Standard recurring sample busy blocks for realistic demo availability testing
      { start: '10:00', end: '10:30' },
      { start: '14:00', end: '15:00' },
    ];
  }

  /**
   * 1. Google OAuth 2.0 Authorization URL
   */
  async getAuthorizationUrl({ state, redirectUri }) {
    if (this.isDemoMode) {
      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?demo=true&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
        isDemoMode: true,
        setupMessage: 'Google Calendar credentials are not configured. Running in secure Demo Mode with simulated Google OAuth.',
      };
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline', // Required to receive refresh_token
      prompt: 'consent',     // Force prompt to ensure refresh_token is returned
      state: state || '',
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      isDemoMode: false,
    };
  }

  /**
   * 2. Exchange authorization code for access & refresh tokens
   */
  async exchangeCodeForTokens({ code, redirectUri, state }) {
    if (this.isDemoMode || code?.startsWith('demo_') || code === 'test_code') {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      return {
        success: true,
        isDemoMode: true,
        accountEmail: 'demo.rep@outlaunch-saas.com',
        accessToken: `demo_gcal_access_token_${Date.now()}`,
        refreshToken: `demo_gcal_refresh_token_${Date.now()}`,
        expiresAt,
        provider: 'google',
        calendarId: 'primary',
        calendarName: 'Primary Calendar (Demo)',
      };
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error_description || data.error || 'Failed to exchange authorization code.');
      }

      // Fetch user profile email
      let accountEmail = 'connected.user@gmail.com';
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          if (userInfo.email) accountEmail = userInfo.email;
        }
      } catch {}

      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        success: true,
        isDemoMode: false,
        accountEmail,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresAt,
        provider: 'google',
        calendarId: 'primary',
        calendarName: accountEmail,
      };
    } catch (err) {
      throw new Error(`Google OAuth exchange failed: ${err.message}`);
    }
  }

  /**
   * 3. Refresh Access Token using Refresh Token
   */
  async refreshAccessToken({ refreshToken }) {
    if (this.isDemoMode || refreshToken?.startsWith('demo_') || refreshToken === 'test_refresh_token') {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      return {
        success: true,
        isDemoMode: true,
        accessToken: `demo_gcal_refreshed_token_${Date.now()}`,
        expiresAt,
      };
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error_description || data.error || 'Failed to refresh access token.');
      }

      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      return {
        success: true,
        isDemoMode: false,
        accessToken: data.access_token,
        expiresAt,
      };
    } catch (err) {
      throw new Error(`Google token refresh failed: ${err.message}`);
    }
  }

  /**
   * 4. List user's calendars
   */
  async listCalendars({ accessToken }) {
    if (this.isDemoMode || accessToken?.startsWith('demo_')) {
      return [
        { id: 'primary', summary: 'Primary Calendar (Demo)', primary: true, accessRole: 'owner' },
        { id: 'sales_meetings', summary: 'Sales & Demos', primary: false, accessRole: 'writer' },
      ];
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to list calendars.');
      }

      return (data.items || []).map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: Boolean(cal.primary),
        accessRole: cal.accessRole,
      }));
    } catch (err) {
      throw new Error(`Google listCalendars error: ${err.message}`);
    }
  }

  /**
   * 5. Free/Busy Availability Query
   * Queries provider for busy intervals without exposing private event titles or descriptions.
   */
  async getFreeBusy({ accessToken, calendarId = 'primary', timeMin, timeMax }) {
    if (this.isDemoMode || accessToken?.startsWith('demo_')) {
      // In demo mode: synthesize realistic busy blocks based on timeMin/timeMax
      const minDate = new Date(timeMin);
      const maxDate = new Date(timeMax);
      const busy = [];

      // Include in-memory created demo events
      for (const [id, evt] of this.demoEvents.entries()) {
        if (evt.status !== 'cancelled') {
          const eStart = new Date(evt.start);
          const eEnd = new Date(evt.end);
          if (eEnd > minDate && eStart < maxDate) {
            busy.push({ start: evt.start, end: evt.end });
          }
        }
      }

      // Add baseline recurring busy blocks for demonstration
      const cur = new Date(minDate);
      while (cur < maxDate) {
        const dateStr = cur.toISOString().split('T')[0];
        for (const block of this.demoBusyBlocks) {
          busy.push({
            start: `${dateStr}T${block.start}:00.000Z`,
            end: `${dateStr}T${block.end}:00.000Z`,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }

      return {
        calendarId,
        busy,
        isDemoMode: true,
      };
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin: new Date(timeMin).toISOString(),
          timeMax: new Date(timeMax).toISOString(),
          items: [{ id: calendarId }],
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to query calendar availability.');
      }

      const calData = data.calendars?.[calendarId];
      const busy = (calData?.busy || []).map(b => ({
        start: b.start,
        end: b.end,
      }));

      return {
        calendarId,
        busy,
        isDemoMode: false,
      };
    } catch (err) {
      throw new Error(`Google FreeBusy error: ${err.message}`);
    }
  }

  /**
   * 6. Create Calendar Event with Google Meet conference
   */
  async createEvent({ accessToken, calendarId = 'primary', eventData }) {
    const { summary, description, start, end, attendees = [], idempotencyKey } = eventData;

    if (!summary || !start || !end) {
      throw new Error('Event summary, start time, and end time are required.');
    }

    if (this.isDemoMode || accessToken?.startsWith('demo_')) {
      const eventId = `gcal_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const meetId = Math.random().toString(36).substring(2, 5) + '-' +
                     Math.random().toString(36).substring(2, 6) + '-' +
                     Math.random().toString(36).substring(2, 5);
      const meetingLink = `https://meet.google.com/${meetId}`;

      const createdEvent = {
        id: eventId,
        provider_event_id: eventId,
        summary,
        description,
        start,
        end,
        status: 'confirmed',
        attendees,
        meeting_link: meetingLink,
        hangoutLink: meetingLink,
        htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
        isDemoMode: true,
        created_at: new Date().toISOString(),
      };

      this.demoEvents.set(eventId, createdEvent);
      return createdEvent;
    }

    try {
      const requestId = idempotencyKey || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const body = {
        summary,
        description,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
        attendees: attendees.map(email => (typeof email === 'string' ? { email } : email)),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to create calendar event.');
      }

      const meetingLink = data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || null;

      return {
        id: data.id,
        provider_event_id: data.id,
        summary: data.summary,
        description: data.description,
        start: data.start?.dateTime || data.start?.date,
        end: data.end?.dateTime || data.end?.date,
        status: data.status,
        meeting_link: meetingLink,
        htmlLink: data.htmlLink,
        isDemoMode: false,
      };
    } catch (err) {
      throw new Error(`Google createEvent error: ${err.message}`);
    }
  }

  /**
   * 7. Update / Reschedule Calendar Event
   */
  async updateEvent({ accessToken, calendarId = 'primary', eventId, eventData }) {
    if (!eventId) throw new Error('Event ID is required for update.');

    if (this.isDemoMode || accessToken?.startsWith('demo_')) {
      const existing = this.demoEvents.get(eventId) || { id: eventId };
      const updated = {
        ...existing,
        ...eventData,
        updated_at: new Date().toISOString(),
      };
      this.demoEvents.set(eventId, updated);
      return updated;
    }

    try {
      const patchBody = {};
      if (eventData.summary) patchBody.summary = eventData.summary;
      if (eventData.description) patchBody.description = eventData.description;
      if (eventData.start) patchBody.start = { dateTime: new Date(eventData.start).toISOString() };
      if (eventData.end) patchBody.end = { dateTime: new Date(eventData.end).toISOString() };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patchBody),
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to update calendar event.');
      }

      return {
        id: data.id,
        provider_event_id: data.id,
        summary: data.summary,
        start: data.start?.dateTime || data.start?.date,
        end: data.end?.dateTime || data.end?.date,
        status: data.status,
        meeting_link: data.hangoutLink || null,
        isDemoMode: false,
      };
    } catch (err) {
      throw new Error(`Google updateEvent error: ${err.message}`);
    }
  }

  /**
   * 8. Cancel / Delete Calendar Event
   */
  async cancelEvent({ accessToken, calendarId = 'primary', eventId }) {
    if (!eventId) throw new Error('Event ID is required for cancellation.');

    if (this.isDemoMode || accessToken?.startsWith('demo_')) {
      if (this.demoEvents.has(eventId)) {
        const evt = this.demoEvents.get(eventId);
        evt.status = 'cancelled';
        evt.cancelled_at = new Date().toISOString();
        this.demoEvents.set(eventId, evt);
      }
      return { success: true, cancelled: true, eventId, isDemoMode: true };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // Google returns 204 No Content on successful deletion
      if (response.status === 204 || response.ok) {
        return { success: true, cancelled: true, eventId, isDemoMode: false };
      }

      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Failed to delete calendar event (Status ${response.status}).`);
    } catch (err) {
      throw new Error(`Google cancelEvent error: ${err.message}`);
    }
  }

  /**
   * 9. Get Event Details
   */
  async getEvent({ accessToken, calendarId = 'primary', eventId }) {
    if (!eventId) throw new Error('Event ID is required.');

    if (this.isDemoMode || accessToken?.startsWith('demo_')) {
      const evt = this.demoEvents.get(eventId);
      return evt || { id: eventId, status: 'confirmed', isDemoMode: true };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to fetch calendar event.');
      }

      return {
        id: data.id,
        summary: data.summary,
        description: data.description,
        start: data.start?.dateTime || data.start?.date,
        end: data.end?.dateTime || data.end?.date,
        status: data.status,
        meeting_link: data.hangoutLink || null,
        isDemoMode: false,
      };
    } catch (err) {
      throw new Error(`Google getEvent error: ${err.message}`);
    }
  }
}
