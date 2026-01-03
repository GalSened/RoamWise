# RoamWise PWA - Complete Browser Test Plan

## Overview
This test plan is designed for **Claude Web** to execute manually in a browser. Test the deployed app at:
- **Production URL:** https://frontend-gamma-dun.vercel.app
- **Planner URL:** https://frontend-gamma-dun.vercel.app/planner.html

---

## Test Environment Setup

### Prerequisites
1. Use Chrome, Firefox, or Safari (latest version)
2. Allow microphone permissions when prompted
3. Enable location services (optional, for enhanced testing)
4. Test on both desktop and mobile viewport sizes

### Browser DevTools
Keep DevTools open (F12) to monitor:
- Console for errors
- Network tab for API calls
- Application tab for PWA/ServiceWorker

---

## SUITE 1: Landing Page (index.html)

### Test 1.1: Page Load
**URL:** `https://frontend-gamma-dun.vercel.app`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to URL | Page loads without errors |
| 2 | Check console | No JavaScript errors (warnings OK) |
| 3 | Verify title | Title contains "RoamWise" |
| 4 | Check favicon | Favicon/icon displays |

### Test 1.2: Navigation Elements
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look for main navigation | Navigation menu or links visible |
| 2 | Click any "Planner" or "AI Co-Pilot" link | Navigates to planner.html |
| 3 | Check for language switcher | Hebrew/English toggle if present |

### Test 1.3: PWA Installation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check address bar | Install icon appears (desktop) |
| 2 | Open DevTools > Application > Manifest | Valid manifest.webmanifest loaded |
| 3 | Check Service Worker | SW registered and active |

---

## SUITE 2: AI Planner Page (planner.html)

### Test 2.1: Page Structure
**URL:** `https://frontend-gamma-dun.vercel.app/planner.html`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to planner.html | Page loads in <3 seconds |
| 2 | Verify header | "AI Co-Pilot" title with sparkles icon |
| 3 | Verify map section | Leaflet map visible (top ~40%) |
| 4 | Verify chat section | Chat interface visible (bottom ~60%) |
| 5 | Check welcome message | "Hey! I'm your AI travel co-pilot..." displayed |
| 6 | Check quick options | Buttons: "Ein Gedi", "Dead Sea", "Masada", "Jerusalem" |

### Test 2.2: Map Functionality
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify map renders | OpenStreetMap tiles visible |
| 2 | Check Leaflet attribution | "Leaflet | OpenStreetMap" link visible |
| 3 | Drag map | Map pans smoothly |
| 4 | Pinch/scroll zoom | Map zooms in/out |
| 5 | Double-click | Map zooms to clicked location |

### Test 2.3: Chat Input Area
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate input field | Placeholder: "Ask your travel co-pilot..." |
| 2 | Locate voice button | Microphone icon button (gray) |
| 3 | Locate send button | Send icon button (disabled when empty) |
| 4 | Click in input field | Input receives focus |

---

## SUITE 3: Chat Functionality

### Test 3.1: Text Input Basic
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "Hello" in input | Text appears in field |
| 2 | Observe send button | Button becomes enabled (blue) |
| 3 | Click send button | Message sent, input clears |
| 4 | Observe chat | User message appears as blue bubble (right) |
| 5 | Wait for response | AI response appears as gray bubble (left) |
| 6 | Check typing indicator | "Co-pilot is thinking..." with dots animation |

### Test 3.2: Quick Option Buttons
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Ein Gedi" button | Message "Ein Gedi" sent |
| 2 | Wait for AI response | Response includes Ein Gedi information |
| 3 | Click "Dead Sea" button | Message "Dead Sea" sent |
| 4 | Click "Masada" button | Message "Masada" sent |
| 5 | Click "Jerusalem" button | Message "Jerusalem" sent |

### Test 3.3: Keyboard Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type message, press Enter | Message sent (same as click send) |
| 2 | Type message, press Shift+Enter | Should NOT send (if multiline supported) |
| 3 | Tab through elements | Focus moves: input → voice → send |

### Test 3.4: Route Planning Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "Plan a trip to Masada" | Message sent |
| 2 | Wait for AI response | AI asks follow-up questions or shows route |
| 3 | If options shown, click one | Selection sent as message |
| 4 | Continue conversation | AI builds route incrementally |
| 5 | When route complete | Map shows markers and polyline |
| 6 | Check "Navigate" FAB | Blue "Navigate" button appears on map |

### Test 3.5: Message Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send multiple messages | All messages display in order |
| 2 | Scroll chat area | Can scroll through history |
| 3 | New message arrives | Auto-scrolls to bottom |
| 4 | Check message alignment | User = right, AI = left |
| 5 | Check bubble styling | User = blue, AI = gray |

---

## SUITE 4: Voice Input Feature

### Test 4.1: Voice Button States
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe voice button (idle) | Gray microphone icon |
| 2 | Click voice button | Browser requests mic permission |
| 3 | Grant permission | Button turns RED with pulse animation |
| 4 | Observe aria-label | Changes to "Stop recording" |

### Test 4.2: Recording Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click mic to start | Recording begins (red pulse) |
| 2 | Speak clearly: "Hello" | (Recording captures audio) |
| 3 | Click to stop | Button shows spinner briefly |
| 4 | Wait for processing | "Processing audio..." state |
| 5 | Transcription complete | Text appears in input field |
| 6 | Verify text | Transcribed text matches speech |

### Test 4.3: Hebrew Voice Input
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click mic to start | Recording begins |
| 2 | Speak Hebrew: "שלום" | (Recording captures) |
| 3 | Stop recording | Processing begins |
| 4 | Check transcription | Hebrew text "שלום" appears |

### Test 4.4: Voice Error Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Deny mic permission | Error message displayed |
| 2 | Record very short (<0.5s) | "No speech detected" or similar |
| 3 | Record silence only | Appropriate error/empty handling |

### Test 4.5: Voice + Send Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record voice message | Text appears in input |
| 2 | Edit transcribed text | Can modify before sending |
| 3 | Press Enter or click Send | Message sent with edited text |
| 4 | AI responds | Response received normally |

---

## SUITE 5: Map Markers & Routes

### Test 5.1: Route Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete a route request | AI confirms route planned |
| 2 | Check map for markers | Start (green car), stops, destination (red target) |
| 3 | Check route line | Blue polyline connects all points |
| 4 | Zoom to fit | Map auto-zooms to show full route |

### Test 5.2: Marker Interactions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a marker | Popup appears |
| 2 | Check popup content | Name, duration (if available) |
| 3 | Check "Navigate" link | Opens Waze in new tab |
| 4 | Close popup | Click X or outside popup |

### Test 5.3: Navigate FAB
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | With route on map | Blue "Navigate" button visible |
| 2 | Click Navigate button | Opens Waze to destination |
| 3 | Verify Waze URL | `waze.com/ul?ll=LAT,LNG&navigate=yes` |

---

## SUITE 6: Clear/Reset Functionality

### Test 6.1: Clear Chat
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Have messages in chat | Multiple messages visible |
| 2 | Find refresh/clear button | Icon in header (refresh icon) |
| 3 | Click clear button | Confirmation or immediate clear |
| 4 | Verify chat cleared | Only welcome message remains |
| 5 | Verify map cleared | No markers or route lines |
| 6 | Verify localStorage | Chat history removed |

### Test 6.2: Page Refresh Persistence
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send a few messages | Messages in chat |
| 2 | Refresh page (F5) | Page reloads |
| 3 | Check chat history | Previous messages restored |
| 4 | Check route | Route restored if was present |

---

## SUITE 7: Responsive Design

### Test 7.1: Desktop View (>1024px)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 1200x800 | Full desktop layout |
| 2 | Verify map size | ~40% of viewport height |
| 3 | Verify chat size | ~60% of viewport height |
| 4 | All buttons visible | No overflow/hidden elements |

### Test 7.2: Tablet View (768px-1024px)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 800x600 | Tablet layout |
| 2 | Verify layout adapts | Elements resize appropriately |
| 3 | Touch targets | Buttons at least 44x44px |

### Test 7.3: Mobile View (<768px)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 375x667 (iPhone) | Mobile layout |
| 2 | Verify full-width layout | No horizontal scroll |
| 3 | Check input area | Fixed at bottom, above keyboard |
| 4 | Check map | Still visible and interactive |
| 5 | Quick buttons | Wrap to multiple lines if needed |

### Test 7.4: RTL Layout (Hebrew)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check HTML dir attribute | `dir="rtl"` on html element |
| 2 | Verify text alignment | Hebrew text right-aligned |
| 3 | Verify button positions | Appropriate for RTL |
| 4 | Chat bubbles | User still on right, AI on left |

---

## SUITE 8: Network & API

### Test 8.1: API Health Check
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Network tab | Monitor requests |
| 2 | Send chat message | POST to proxy API visible |
| 3 | Check response | 200 OK with JSON |
| 4 | Verify no CORS errors | No blocked requests |

### Test 8.2: Whisper API
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record voice message | Recording completes |
| 2 | Check Network tab | POST to `/whisper-intent` |
| 3 | Verify request | FormData with audio blob |
| 4 | Verify response | `{ ok: true, text: "..." }` |

### Test 8.3: Offline Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go offline (DevTools Network) | Set to Offline |
| 2 | Try to send message | Error message displayed |
| 3 | Try voice input | Appropriate error |
| 4 | Go back online | Functionality restored |

### Test 8.4: Slow Network
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set throttling to "Slow 3G" | Network throttled |
| 2 | Send message | Loading state visible |
| 3 | Wait for response | Eventually completes |
| 4 | Verify no timeout crash | Graceful handling |

---

## SUITE 9: Edge Cases & Error Handling

### Test 9.1: Empty/Invalid Input
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to send empty message | Send button disabled |
| 2 | Type only spaces | Send button stays disabled |
| 3 | Type then delete all | Button becomes disabled |

### Test 9.2: Long Messages
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type 500+ character message | Input accepts text |
| 2 | Send long message | Message sent successfully |
| 3 | Check display | Message wraps properly |
| 4 | Check AI response | Handles long input |

### Test 9.3: Special Characters
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type: `<script>alert('xss')</script>` | Text displayed as-is (escaped) |
| 2 | Type: `& < > " '` | Characters display correctly |
| 3 | Type emojis: `🚗 🗺️ 🏖️` | Emojis render properly |
| 4 | Type Hebrew + English mix | Both render correctly |

### Test 9.4: Rapid Actions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click send rapidly 5 times | Only one message sent |
| 2 | Click voice start/stop rapidly | No crash, handles gracefully |
| 3 | Click multiple quick buttons | Requests handled sequentially |

### Test 9.5: Concurrent Voice + Type
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start voice recording | Recording active |
| 2 | While recording, type in input | Can still type |
| 3 | Stop recording | Transcription replaces/appends |
| 4 | Check input state | Consistent state |

---

## SUITE 10: Accessibility

### Test 10.1: Keyboard Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Press Tab repeatedly | Focus moves through all interactive elements |
| 2 | Focus on button, press Enter | Button activates |
| 3 | Focus on input, press Enter | Sends message |
| 4 | Check focus visibility | Clear focus ring on elements |

### Test 10.2: Screen Reader Labels
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check voice button | aria-label: "Start voice input" |
| 2 | Check send button | aria-label: "Send message" |
| 3 | Check input field | aria-label: "Message input" |
| 4 | Check map | Appropriate labels/roles |

### Test 10.3: Color Contrast
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check text on white background | Readable contrast |
| 2 | Check white text on blue buttons | Sufficient contrast |
| 3 | Check disabled button state | Clearly distinguishable |

---

## SUITE 11: Performance

### Test 11.1: Initial Load
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear cache, reload | Fresh load |
| 2 | Check DOMContentLoaded | <2 seconds |
| 3 | Check full load | <5 seconds |
| 4 | Check Largest Contentful Paint | <2.5 seconds |

### Test 11.2: Runtime Performance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send 20 messages | No lag or slowdown |
| 2 | Scroll chat rapidly | Smooth scrolling |
| 3 | Pan map while chatting | No jank |
| 4 | Check memory usage | No memory leaks |

---

## SUITE 12: Security

### Test 12.1: API Key Exposure
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View page source | No API keys visible |
| 2 | Check JS bundle | No hardcoded secrets |
| 3 | Check Network requests | Keys not in client requests |

### Test 12.2: XSS Prevention
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send: `<img src=x onerror=alert(1)>` | Rendered as text, no alert |
| 2 | Check AI response rendering | No script execution |

---

## Test Results Template

### Summary
| Suite | Total Tests | Passed | Failed | Blocked |
|-------|------------|--------|--------|---------|
| 1. Landing Page | 4 | | | |
| 2. AI Planner Page | 5 | | | |
| 3. Chat Functionality | 5 | | | |
| 4. Voice Input | 5 | | | |
| 5. Map & Routes | 3 | | | |
| 6. Clear/Reset | 2 | | | |
| 7. Responsive | 4 | | | |
| 8. Network & API | 4 | | | |
| 9. Edge Cases | 5 | | | |
| 10. Accessibility | 3 | | | |
| 11. Performance | 2 | | | |
| 12. Security | 2 | | | |
| **TOTAL** | **44** | | | |

### Failed Tests Log
| Suite.Test | Description | Actual Result | Screenshot |
|------------|-------------|---------------|------------|
| | | | |

### Notes
- Test Date: ___________
- Tester: Claude Web
- Browser: ___________
- Viewport: ___________

---

## Appendix: Test Data

### Sample Voice Phrases
- English: "Plan a trip to the Dead Sea"
- Hebrew: "תכנן טיול לים המלח"
- Mixed: "I want to visit מצדה tomorrow"

### Sample Destinations
- Ein Gedi (עין גדי) - 31.4717, 35.3856
- Dead Sea (ים המלח) - 31.5, 35.5
- Masada (מצדה) - 31.3156, 35.3536
- Jerusalem (ירושלים) - 31.7683, 35.2137

### API Endpoints
- Proxy: `https://roamwise-proxy-971999716773.us-central1.run.app`
- Whisper: `/whisper-intent`
- Chat: `/api/ai-chat`
