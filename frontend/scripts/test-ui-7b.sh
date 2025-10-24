#!/usr/bin/env bash
set -euo pipefail

echo "=== Step 7B UI Test ==="
echo ""

# Check if required files exist
echo "--- Checking Files ---"

if [ ! -f "index.html" ]; then
  echo "❌ FAIL: index.html not found"
  exit 1
fi

if [ ! -f "app-main.js" ]; then
  echo "❌ FAIL: app-main.js not found"
  exit 1
fi

if [ ! -f "i18n/en.json" ]; then
  echo "❌ FAIL: i18n/en.json not found"
  exit 1
fi

if [ ! -f "i18n/he.json" ]; then
  echo "❌ FAIL: i18n/he.json not found"
  exit 1
fi

echo "✅ All required files exist"
echo ""

# Check HTML elements
echo "--- Checking HTML Elements ---"

if ! grep -q 'id="btnStartCurrent"' index.html; then
  echo "❌ FAIL: btnStartCurrent not found in HTML"
  exit 1
fi

if ! grep -q 'id="btnStartHotel"' index.html; then
  echo "❌ FAIL: btnStartHotel not found in HTML"
  exit 1
fi

if ! grep -q 'id="hotelInput"' index.html; then
  echo "❌ FAIL: hotelInput not found in HTML"
  exit 1
fi

if ! grep -q 'id="destInput"' index.html; then
  echo "❌ FAIL: destInput not found in HTML"
  exit 1
fi

if ! grep -q 'id="nearRadius"' index.html; then
  echo "❌ FAIL: nearRadius slider not found in HTML"
  exit 1
fi

if ! grep -q 'id="detourMin"' index.html; then
  echo "❌ FAIL: detourMin slider not found in HTML"
  exit 1
fi

if ! grep -q 'id="btnPlanDay"' index.html; then
  echo "❌ FAIL: btnPlanDay not found in HTML"
  exit 1
fi

if ! grep -q 'id="planner-results"' index.html; then
  echo "❌ FAIL: planner-results container not found in HTML"
  exit 1
fi

echo "✅ All required HTML elements present"
echo ""

# Check data-i18n attributes
echo "--- Checking i18n Attributes ---"

if ! grep -q 'data-i18n="planner.start_from"' index.html; then
  echo "❌ FAIL: data-i18n planner.start_from not found"
  exit 1
fi

if ! grep -q 'data-i18n="planner.my_location"' index.html; then
  echo "❌ FAIL: data-i18n planner.my_location not found"
  exit 1
fi

if ! grep -q 'data-i18n="planner.my_hotel"' index.html; then
  echo "❌ FAIL: data-i18n planner.my_hotel not found"
  exit 1
fi

if ! grep -q 'data-i18n="planner.plan_day"' index.html; then
  echo "❌ FAIL: data-i18n planner.plan_day not found"
  exit 1
fi

echo "✅ All i18n attributes present"
echo ""

# Check JavaScript implementation
echo "--- Checking JavaScript Implementation ---"

if ! grep -q 'setupPlannerUI()' app-main.js; then
  echo "❌ FAIL: setupPlannerUI() function not found in app-main.js"
  exit 1
fi

if ! grep -q 'this.setupPlannerUI()' app-main.js; then
  echo "❌ FAIL: setupPlannerUI() not called in initialization"
  exit 1
fi

if ! grep -q 'btnStartCurrent' app-main.js; then
  echo "❌ FAIL: btnStartCurrent handling not found in JS"
  exit 1
fi

if ! grep -q 'btnStartHotel' app-main.js; then
  echo "❌ FAIL: btnStartHotel handling not found in JS"
  exit 1
fi

if ! grep -q 'navigator.geolocation' app-main.js; then
  echo "❌ FAIL: geolocation API not used for current location"
  exit 1
fi

if ! grep -q 'roamwise-proxy.*planner/plan-day' app-main.js; then
  echo "❌ FAIL: /planner/plan-day endpoint not called via proxy"
  exit 1
fi

if ! grep -q 'origin_query' app-main.js; then
  echo "❌ FAIL: origin_query (hotel mode) not implemented"
  exit 1
fi

if ! grep -q 'near_origin' app-main.js; then
  echo "❌ FAIL: near_origin parameter not sent"
  exit 1
fi

if ! grep -q 'radius_km' app-main.js; then
  echo "❌ FAIL: radius_km not configured"
  exit 1
fi

if ! grep -q 'max_detour_min' app-main.js; then
  echo "❌ FAIL: max_detour_min (SAR) not configured"
  exit 1
fi

echo "✅ JavaScript implementation correct"
echo ""

# Check i18n translations
echo "--- Checking i18n Translations ---"

# Check English
if ! jq -e '.["planner.start_from"]' i18n/en.json > /dev/null 2>&1; then
  echo "❌ FAIL: planner.start_from not in en.json"
  exit 1
fi

if ! jq -e '.["planner.plan_day"]' i18n/en.json > /dev/null 2>&1; then
  echo "❌ FAIL: planner.plan_day not in en.json"
  exit 1
fi

# Check Hebrew
if ! jq -e '.["planner.start_from"]' i18n/he.json > /dev/null 2>&1; then
  echo "❌ FAIL: planner.start_from not in he.json"
  exit 1
fi

if ! jq -e '.["planner.plan_day"]' i18n/he.json > /dev/null 2>&1; then
  echo "❌ FAIL: planner.plan_day not in he.json"
  exit 1
fi

echo "✅ i18n translations present"
echo ""

# Check CSS
echo "--- Checking CSS Styles ---"

if ! grep -q '\.planner-controls' index.html; then
  echo "❌ FAIL: .planner-controls CSS not found"
  exit 1
fi

if ! grep -q '\.seg-btn' index.html; then
  echo "❌ FAIL: .seg-btn CSS not found"
  exit 1
fi

if ! grep -q '\.planner-results' index.html; then
  echo "❌ FAIL: .planner-results CSS not found"
  exit 1
fi

echo "✅ CSS styles present"
echo ""

echo "✅ ALL TESTS PASSED: Step 7B UI Implementation Complete"
echo ""
echo "Manual testing steps:"
echo "1. Open the app in a browser"
echo "2. Navigate to Trip View"
echo "3. Test 'My Location' mode (allow geolocation)"
echo "4. Test 'My Hotel' mode with hotel name"
echo "5. Adjust radius and detour sliders"
echo "6. Click 'Plan Day' and verify results display"
echo "7. Test EN/HE language toggle"
exit 0
