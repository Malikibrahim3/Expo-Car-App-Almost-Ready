# Requirements Document

## Introduction

This specification defines the comprehensive redesign of the Vehicle Forecast UI/UX to provide crystal-clear financial transparency, eliminate user confusion between equity and net position, and deliver actionable selling/holding recommendations. The redesign addresses critical user experience issues where users cannot easily understand their true financial position or optimal timing decisions.

## Glossary

- **Vehicle Forecast System**: The application component that calculates and displays vehicle value projections and financial recommendations
- **Equity**: Vehicle current market value minus amount still owed (loans + balloon payments)
- **Net Position**: True profit/loss calculation (Equity minus Total Paid including deposit and all payments made)
- **Total Paid**: Sum of deposit plus all monthly payments made to date
- **Balloon Payment**: Large final payment due at end of PCP agreements that significantly impacts net position
- **Optimal Selling Month**: The month that maximizes net position based on mathematical analysis
- **PCP Agreement**: Personal Contract Purchase with monthly payments plus balloon payment
- **Break-even Point**: The month when net position transitions from loss to profit

## Requirements

### Requirement 1

**User Story:** As a vehicle owner, I want to clearly understand my true financial position (profit or loss) if I sell today, so that I can make informed decisions about my vehicle.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL display both Equity and Net Position separately on all vehicle summary cards
2. THE Vehicle Forecast System SHALL show Net Position as the primary financial indicator with clear profit/loss labeling
3. THE Vehicle Forecast System SHALL use color coding where red indicates loss, yellow indicates approaching break-even, and green indicates profit
4. THE Vehicle Forecast System SHALL provide tooltip explanations for Equity, Net Position, and Total Paid values
5. THE Vehicle Forecast System SHALL never display only equity without accompanying net position context

### Requirement 2

**User Story:** As a vehicle owner with a PCP agreement, I want to understand how my balloon payment affects my optimal selling timing, so that I can maximize my financial outcome.

#### Acceptance Criteria

1. WHEN a vehicle has a balloon payment, THE Vehicle Forecast System SHALL highlight the balloon payment month with visual markers
2. THE Vehicle Forecast System SHALL show the dramatic net position improvement that occurs when balloon payments are cleared
3. THE Vehicle Forecast System SHALL display clear messaging explaining balloon payment impact on recommendations
4. WHERE a vehicle has PCP financing, THE Vehicle Forecast System SHALL emphasize the optimal month to sell relative to balloon payment timing
5. THE Vehicle Forecast System SHALL show before and after net position values for balloon payment months

### Requirement 3

**User Story:** As a vehicle owner, I want actionable recommendations with specific timing and expected outcomes, so that I know exactly when to sell for maximum benefit.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL provide specific optimal selling month recommendations for each vehicle
2. THE Vehicle Forecast System SHALL display expected profit or loss amounts for the optimal selling month
3. THE Vehicle Forecast System SHALL show clear rationale for hold vs sell recommendations in simple language
4. THE Vehicle Forecast System SHALL highlight critical turning points such as break-even months and balloon payment months
5. THE Vehicle Forecast System SHALL provide one-sentence explanations for why holding or selling is recommended

### Requirement 4

**User Story:** As a vehicle owner, I want to see month-by-month projections that clearly separate equity from my actual profit/loss, so that I can understand the financial trajectory of my vehicle.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL display month-by-month tables with separate rows for Equity and Net Position
2. THE Vehicle Forecast System SHALL show projected vehicle values using category-specific depreciation rates
3. THE Vehicle Forecast System SHALL calculate and display loan balance remaining for each month
4. THE Vehicle Forecast System SHALL track Total Paid progression including all deposits and monthly payments
5. THE Vehicle Forecast System SHALL use visual markers to highlight optimal selling months and balloon payment months

### Requirement 5

**User Story:** As a vehicle owner, I want category-specific guidance that explains why my vehicle type (EV, Premium, Exotic) affects my selling strategy, so that I understand the reasoning behind recommendations.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL display the depreciation rate used for each vehicle category
2. THE Vehicle Forecast System SHALL provide category-specific messaging explaining depreciation characteristics
3. WHERE a vehicle is classified as EV, THE Vehicle Forecast System SHALL explain higher depreciation due to technology advancement
4. WHERE a vehicle is classified as Exotic, THE Vehicle Forecast System SHALL explain lower depreciation due to collector value
5. THE Vehicle Forecast System SHALL include tooltips explaining how category affects optimal timing strategies

### Requirement 6

**User Story:** As a vehicle owner, I want loan-type-aware interface that only shows relevant options for my financing situation, so that I don't see confusing or inapplicable information.

#### Acceptance Criteria

1. WHERE a vehicle has PCP financing, THE Vehicle Forecast System SHALL emphasize balloon payment effects on recommendations
2. WHERE a vehicle has traditional loan financing, THE Vehicle Forecast System SHALL focus on gradual amortization benefits
3. WHERE a vehicle is owned outright, THE Vehicle Forecast System SHALL show simplified net position calculations without loan complexity
4. THE Vehicle Forecast System SHALL display appropriate selling options based on legal requirements for each loan type
5. THE Vehicle Forecast System SHALL hide irrelevant financial details based on the specific financing arrangement

### Requirement 7

**User Story:** As a vehicle owner, I want interactive visualizations that help me understand my financial trajectory over time, so that I can see the impact of different selling timing decisions.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL provide line graphs showing vehicle value vs net position over time
2. THE Vehicle Forecast System SHALL use vertical markers to indicate balloon payments and optimal selling months
3. THE Vehicle Forecast System SHALL implement interactive elements allowing users to explore different month scenarios
4. THE Vehicle Forecast System SHALL use consistent color coding across all graphs matching the profit/loss indicators
5. THE Vehicle Forecast System SHALL provide mini-charts showing equity vs net position trends for quick reference

### Requirement 8

**User Story:** As a vehicle owner, I want clear alerts and messaging that guide my decision-making without financial jargon, so that I can understand recommendations regardless of my financial expertise.

#### Acceptance Criteria

1. IF net position is negative, THEN THE Vehicle Forecast System SHALL display clear loss messaging with specific dollar amounts
2. IF net position is approaching break-even, THEN THE Vehicle Forecast System SHALL show encouragement to hold with expected profit timing
3. IF net position is positive, THEN THE Vehicle Forecast System SHALL confirm current profit and compare to optimal timing
4. THE Vehicle Forecast System SHALL use plain language avoiding terms like "amortization," "depreciation curves," or "equity calculations"
5. THE Vehicle Forecast System SHALL provide summary-first, details-second information hierarchy for all recommendations

### Requirement 9

**User Story:** As a vehicle owner adding a new vehicle, I want enhanced input forms that capture information needed for accurate forecasting, so that my projections are as precise as possible.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL include expected monthly mileage input for depreciation adjustments
2. THE Vehicle Forecast System SHALL auto-calculate depreciation curve modifications based on user-provided usage patterns
3. THE Vehicle Forecast System SHALL clearly distinguish between Cash, PCP, and HP loan types during vehicle addition
4. THE Vehicle Forecast System SHALL validate that all required financial information is provided for accurate calculations
5. THE Vehicle Forecast System SHALL provide helpful hints and examples for complex financial inputs like balloon payments

### Requirement 10

**User Story:** As a system administrator, I want comprehensive testing coverage that ensures all financial calculations and UI elements work correctly across different scenarios, so that users receive accurate and reliable information.

#### Acceptance Criteria

1. THE Vehicle Forecast System SHALL verify that equity and net position calculations match backend mathematical models
2. THE Vehicle Forecast System SHALL confirm color coding accurately reflects profit/loss status across all components
3. THE Vehicle Forecast System SHALL validate balloon payment month highlighting triggers correctly for PCP agreements
4. THE Vehicle Forecast System SHALL test edge cases including short-term ownership and extreme balloon payment amounts
5. THE Vehicle Forecast System SHALL ensure all tooltip explanations and messaging display correctly across different device sizes