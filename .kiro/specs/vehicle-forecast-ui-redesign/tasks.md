# Implementation Plan

Convert the Vehicle Forecast UI/UX redesign into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

- [x] 1. Create enhanced data models and utility functions
  - Create TypeScript interfaces for Vehicle, MonthlyProjection, and VehicleRecommendation data models
  - Implement utility functions for color coding logic (profit/loss status determination)
  - Create helper functions for financial calculations (net position, equity calculations)
  - Add category detection and depreciation rate utilities
  - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [ ] 2. Implement core financial calculation enhancements
  - [ ] 2.1 Enhance existing forecast utilities with net position calculations
    - Modify calculateMonthlyForecast to include separate equity and net position tracking
    - Add balloon payment impact calculations for PCP agreements
    - Implement optimal selling month detection algorithm
    - _Requirements: 2.1, 2.2, 3.1, 4.4_

  - [ ] 2.2 Create recommendation engine for actionable guidance
    - Build recommendation logic that analyzes full loan term for optimal timing
    - Implement category-specific guidance generation (EV/Premium/Exotic messaging)
    - Create plain language explanation generator for hold vs sell decisions
    - _Requirements: 3.2, 3.3, 5.3, 5.4, 8.1, 8.2, 8.3_

  - [ ]* 2.3 Write unit tests for enhanced financial calculations
    - Test net position calculations across different loan types
    - Validate optimal month detection for various scenarios
    - Test balloon payment impact calculations
    - _Requirements: 10.1, 10.2_

- [ ] 3. Create enhanced vehicle card component
  - [ ] 3.1 Build new EnhancedVehicleCard component with financial clarity
    - Implement separate display of equity and net position with tooltips
    - Add color-coded net position indicators (red/yellow/green)
    - Create optimal timing display with expected outcomes
    - Include category badges and loan type indicators
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2_

  - [ ] 3.2 Implement recommendation summary section
    - Add optimal selling month display with profit/loss projections
    - Create clear rationale messaging in plain language
    - Implement balloon payment impact highlighting for PCP vehicles
    - _Requirements: 3.1, 3.2, 3.5, 8.4_

  - [ ]* 3.3 Create component tests for enhanced vehicle cards
    - Test color coding matches financial status correctly
    - Validate tooltip content displays appropriate explanations
    - Test recommendation messaging for different vehicle types
    - _Requirements: 10.2, 10.3_

- [ ] 4. Develop monthly projection table component
  - [ ] 4.1 Create MonthlyProjectionTable with dual equity/net position display
    - Build table component with separate columns for equity and net position
    - Implement sticky header with current summary and quick recommendations
    - Add visual markers for balloon payments and optimal selling months
    - Create color-coded status indicators for each month
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ] 4.2 Implement balloon payment and optimal month highlighting
    - Add special styling and icons for balloon payment months
    - Create callout components showing net position improvements
    - Implement optimal month badges and visual emphasis
    - _Requirements: 2.1, 2.2, 4.5_

  - [ ]* 4.3 Write tests for monthly projection table functionality
    - Test table renders correctly with various data scenarios
    - Validate balloon month highlighting triggers appropriately
    - Test color coding accuracy across all months
    - _Requirements: 10.3, 10.4_

- [ ] 5. Build interactive timeline graph component
  - [ ] 5.1 Create InteractiveTimelineGraph with multiple data lines
    - Implement line graph showing vehicle value, equity, and net position over time
    - Add vertical markers for balloon payments and optimal selling months
    - Create interactive slider for month selection and exploration
    - Implement consistent color coding matching other components
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [ ] 5.2 Add interactive features and month selection
    - Implement hover states and tooltips for data points
    - Create selected month details panel with financial breakdown
    - Add graph legend with clear line explanations
    - _Requirements: 7.3, 7.5_

  - [ ]* 5.3 Create tests for interactive graph functionality
    - Test graph renders correctly with different data sets
    - Validate interactive elements respond to user input
    - Test marker positioning for balloon and optimal months
    - _Requirements: 10.4_

- [ ] 6. Implement recommendation panel component
  - [ ] 6.1 Create RecommendationPanel with clear guidance
    - Build primary recommendation display with sell/hold advice
    - Implement outcome preview showing current vs optimal scenarios
    - Add detailed reasoning section with plain language explanations
    - Create balloon payment impact explanations for PCP vehicles
    - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3_

  - [ ] 6.2 Add category-specific insights and risk considerations
    - Implement category-specific guidance for EV/Premium/Exotic vehicles
    - Create risk consideration display with important factors
    - Add educational content explaining depreciation characteristics
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.3 Write tests for recommendation panel accuracy
    - Test recommendation logic produces correct guidance
    - Validate category-specific messaging displays appropriately
    - Test risk factor identification and display
    - _Requirements: 10.1, 10.2_

- [ ] 7. Enhance vehicle addition form
  - [ ] 7.1 Create enhanced VehicleAdditionForm with improved inputs
    - Build comprehensive form with basic vehicle information section
    - Implement loan type selector with clear descriptions
    - Add expected monthly mileage input for better forecasting
    - Create financing details section with conditional inputs based on loan type
    - _Requirements: 9.1, 9.2, 9.3, 6.1, 6.2, 6.3_

  - [ ] 7.2 Implement form validation and preview functionality
    - Add comprehensive input validation with helpful error messages
    - Create forecast preview showing detected category and depreciation rate
    - Implement conditional field display based on selected loan type
    - Add helpful hints and tooltips for complex financial inputs
    - _Requirements: 9.4, 9.5, 6.4, 6.5_

  - [ ]* 7.3 Create form validation and functionality tests
    - Test form validation catches invalid inputs appropriately
    - Validate conditional field display works for all loan types
    - Test preview functionality shows accurate projections
    - _Requirements: 10.5_

- [ ] 8. Create shared UI components and utilities
  - [ ] 8.1 Build reusable tooltip and indicator components
    - Create FinancialTooltip component with consistent styling
    - Implement ColorCodedIndicator for profit/loss status display
    - Build BalloonPaymentMarker for highlighting balloon months
    - Create OptimalTimingBadge for marking best selling months
    - _Requirements: 1.4, 2.1, 4.5_

  - [ ] 8.2 Implement responsive design and accessibility features
    - Add responsive breakpoints for mobile, tablet, and desktop
    - Implement ARIA labels and semantic HTML for screen readers
    - Create keyboard navigation support for all interactive elements
    - Add high contrast mode support and colorblind-friendly palettes
    - _Requirements: 10.5_

  - [ ]* 8.3 Write accessibility and responsive design tests
    - Test components work correctly across different screen sizes
    - Validate ARIA labels and keyboard navigation functionality
    - Test color contrast meets WCAG 2.1 AA standards
    - _Requirements: 10.5_

- [ ] 9. Update main application components
  - [ ] 9.1 Integrate enhanced components into VehicleForecast main component
    - Replace existing vehicle cards with EnhancedVehicleCard components
    - Integrate MonthlyProjectionTable into detailed forecast view
    - Add InteractiveTimelineGraph to vehicle detail pages
    - Wire up RecommendationPanel with calculated recommendations
    - _Requirements: 1.1, 4.1, 7.1, 3.1_

  - [ ] 9.2 Update FinancialOverview component with new recommendation system
    - Integrate enhanced recommendation engine into portfolio overview
    - Update dashboard to show clear profit/loss summaries
    - Add portfolio-level insights using new calculation methods
    - _Requirements: 1.1, 1.2, 3.1_

  - [ ] 9.3 Replace vehicle addition flow with enhanced form
    - Integrate new VehicleAdditionForm into application routing
    - Update form submission handling to use enhanced data models
    - Connect form preview to actual forecast calculation engine
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 10. Implement comprehensive testing and validation
  - [ ] 10.1 Create end-to-end user journey tests
    - Test complete flow from vehicle addition to recommendation viewing
    - Validate financial calculations match expected outcomes across scenarios
    - Test edge cases including extreme balloon payments and short ownership
    - _Requirements: 10.1, 10.4_

  - [ ] 10.2 Implement visual regression testing
    - Create screenshot tests for all major UI components
    - Validate color coding consistency across all components
    - Test responsive design across multiple device sizes
    - _Requirements: 10.2, 10.5_

  - [ ]* 10.3 Performance and accessibility audit
    - Test calculation performance meets <100ms target for projections
    - Validate accessibility compliance with automated testing tools
    - Test mobile performance on lower-powered devices
    - _Requirements: 10.5_

- [ ] 11. Final integration and polish
  - [ ] 11.1 Integrate all components into cohesive user experience
    - Ensure consistent styling and behavior across all new components
    - Implement smooth transitions between different views
    - Add loading states and error handling for all calculations
    - Verify data consistency across all UI components
    - _Requirements: 1.5, 8.4_

  - [ ] 11.2 Optimize performance and add final polish
    - Implement calculation caching to avoid redundant processing
    - Add micro-interactions and animations for enhanced user experience
    - Optimize bundle size and implement lazy loading for detailed views
    - _Requirements: Performance considerations from design document_

  - [ ]* 11.3 Final comprehensive testing and validation
    - Run complete test suite including unit, integration, and e2e tests
    - Validate all requirements are met through systematic testing
    - Perform user acceptance testing with realistic scenarios
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_