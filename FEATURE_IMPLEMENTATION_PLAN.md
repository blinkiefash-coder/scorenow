# 6-Feature Implementation Plan: Web + Mobile Simultaneously

## Features to Implement
1. **Login Welcome Pop-up** - Show confirmation after login, track with localStorage/Preferences
2. **Customer Profile Auto-population** - Fetch and display user's registered name  
3. **Health Assessment Requests** - Track requests, display on admin dashboard with status
4. **Plans & Services** - Display page showing all service plans with pricing
5. **Testimonials Section** - Show customer reviews and success stories
6. **Admin Dashboard Management** - Extend admin dashboard for customer and request management

## Implementation Strategy

### Phase 1: Backend (Database + APIs)
1. Add schema for health assessment requests (if not exists)
2. Add schema for testimonials (if not exists)
3. Create API endpoints:
   - GET/POST /api/health-assessment-requests
   - GET /api/testimonials
   - PUT /api/admin/health-assessments/:id/status

### Phase 2: Web Frontend (React/TypeScript)
1. Create LoginWelcomePopup component
2. Update AuthModal to show popup after successful login
3. Create CustomerProfile component with name auto-population
4. Create PlansServices page with pricing cards
5. Create Testimonials component for landing page
6. Extend AdminDashboard to show health assessment requests

### Phase 3: Mobile Frontend (Flutter)
1. Create LoginWelcomePopup in Flutter
2. Integrate with SharedPreferences to track shown status
3. Create CustomerProfileScreen with name auto-population
4. Create PlansServicesScreen with service cards
5. Create TestimonialsWidget for landing page
6. Extend AdminShell with health assessment management

## Key Implementation Details

### Health Assessment Requests Table
```sql
CREATE TABLE health_assessment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  request_type TEXT, -- 'personal' or 'business'
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, closed
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
)
```

### Testimonials Table
```sql
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  result_description TEXT,
  published BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
)
```

## Dependency Order
1. Backend schema + APIs (no dependencies)
2. Web Auth Flow → LoginWelcomePopup (depends on auth)
3. Web PlansServices page (independent)
4. Web Testimonials (independent)
5. Web Customer Profile (depends on auth + user data)
6. Web Admin Dashboard (depends on backend APIs)
7. Mobile same components (parallel after backend ready)

## Testing Strategy
- Test login popup appears exactly once per session
- Test customer name populates from auth context
- Test health assessment requests show in admin dashboard
- Test plans display correctly with pricing
- Test testimonials render with star ratings
- Test admin can change health assessment status

## Deployment Considerations
- No breaking changes to existing APIs
- All new tables are additive (no schema modifications)
- Frontend components are isolated and can be enabled/disabled
- Mobile app can use existing Flutter patterns
