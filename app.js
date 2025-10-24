// traveling — app.js (with Weather card & compare)
const PROXY = "https://roamwise-proxy-971999716773.us-central1.run.app"; // e.g. https://roamwise-proxy-xxxxx.a.run.app

// Leaflet map
let map = L.map('map', { zoomControl:true }).setView([45.8144, 10.8400], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom: 19, attribution: '\u00A9 OpenStreetMap'
}).addTo(map);
let hereMarker, resultsLayer = L.layerGroup().addTo(map), routeLayer = L.layerGroup().addTo(map), hazardsLayer = L.layerGroup().addTo(map);

const ui = {
  intent: () => document.getElementById('intent').value,
  routeBox: document.getElementById('routeBox'),
  placeBox: document.getElementById('placeBox'),
  activitiesFilters: document.getElementById('activitiesFilters'),
  dest: document.getElementById('dest'),
  acList: document.getElementById('acList'),
  goRouteBtn: document.getElementById('goRouteBtn'),
  searchBtn: document.getElementById('searchBtn'),
  status: document.getElementById('status'),
  routeMeta: document.getElementById('routeMeta'),
  routeLinks: document.getElementById('routeLinks'),
  routeGmapsBtn: document.getElementById('routeGmapsBtn'),
  routeWazeBtn: document.getElementById('routeWazeBtn'),
  list: document.getElementById('list'),
  openNow: () => document.getElementById('openNow').checked,
  radius: () => parseInt(document.getElementById('radius').value, 10),
  minRating: () => parseFloat(document.getElementById('minRating').value),
  freeText: document.getElementById('freeText'),
  thinkBtn: document.getElementById('thinkBtn'),
  thinkStatus: document.getElementById('thinkStatus'),
  travelMode: () => document.getElementById('travelMode').value,
  favList: document.getElementById('favList'),
  wxTemp: document.getElementById('wxTemp'),
  wxDesc: document.getElementById('wxDesc'),
  wxHiLo: document.getElementById('wxHiLo'),
  wxNext: document.getElementById('wxNext'),
  wxRefresh: document.getElementById('wxRefresh'),
  // AI Elements
  moodSelect: document.getElementById('moodSelect'),
  voiceBtn: document.getElementById('voiceBtn'),
  voiceStatus: document.getElementById('voiceStatus'),
  voiceResponse: document.getElementById('voiceResponse'),
  aiRecommendBtn: document.getElementById('aiRecommendBtn'),
  aiRecommendations: document.getElementById('aiRecommendations'),
  smartNotifications: document.getElementById('smartNotifications'),
  aiToggle: document.getElementById('aiToggle'),
  voiceHelpBtn: document.getElementById('voiceHelpBtn'),
  // Trip Planning Elements
  tripToggle: document.getElementById('tripToggle'),
  tripPlanForm: document.getElementById('tripPlanForm'),
  tripDuration: document.getElementById('tripDuration'),
  customHoursField: document.getElementById('customHoursField'),
  customHours: document.getElementById('customHours'),
  tripBudget: document.getElementById('tripBudget'),
  groupSize: document.getElementById('groupSize'),
  tripMobility: document.getElementById('tripMobility'),
  planTripBtn: document.getElementById('planTripBtn'),
  tripPlanStatus: document.getElementById('tripPlanStatus'),
  tripPlanDisplay: document.getElementById('tripPlanDisplay'),
  liveNavigation: document.getElementById('liveNavigation'),
  // Profile Elements
  totalVisits: document.getElementById('totalVisits'),
  avgRating: document.getElementById('avgRating'),
  refreshInsights: document.getElementById('refreshInsights')
};

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.onclick = async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt = null; btn.textContent='מותקן'; };
});

// Geolocation + initial weather
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async (p)=>{
    const lat = p.coords.latitude, lng = p.coords.longitude;
    map.setView([lat,lng], 13);
    hereMarker?.remove();
    hereMarker = L.marker([lat,lng], {title:'המיקום שלך'}).addTo(map);
    try { await updateWeatherCard(lat,lng); } catch {}
  }, ()=>{}, {enableHighAccuracy:true, timeout:8000});
}
ui.wxRefresh.addEventListener('click', async ()=>{
  const c = map.getCenter();
  ui.wxDesc.textContent = 'מרענן…';
  try { await updateWeatherCard(c.lat, c.lng); } catch { ui.wxDesc.textContent = 'שגיאה במז״א'; }
});

// UI events
document.getElementById('intent').addEventListener('change', onIntentChange);
document.querySelectorAll('[data-preset]').forEach(btn=>{
  btn.addEventListener('click', ()=> { setIntent(btn.dataset.preset); });
});
document.querySelectorAll('[data-activity]').forEach(btn=>{
  btn.addEventListener('click', ()=> { selectedActivity = btn.dataset.activity; doPlaces(); });
});
ui.searchBtn.addEventListener('click', doPlaces);
ui.goRouteBtn.addEventListener('click', doRoute);
ui.dest.addEventListener('input', debounce(doAutocomplete, 250));
ui.thinkBtn.addEventListener('click', doThink);

// AI Event Listeners
ui.voiceBtn.addEventListener('click', startVoiceInput);
ui.aiRecommendBtn.addEventListener('click', getAIRecommendations);
ui.moodSelect.addEventListener('change', onMoodChange);
ui.aiToggle.addEventListener('click', toggleAISettings);
ui.voiceHelpBtn.addEventListener('click', showVoiceHelp);

function setIntent(mode){ document.getElementById('intent').value = mode; onIntentChange(); }

let selectedActivity = null;
function onIntentChange(){
  const v = ui.intent();
  ui.routeBox.hidden = (v !== 'route');
  ui.placeBox.hidden = (v === 'route');
  ui.activitiesFilters.hidden = (v !== 'activities');
  if (v !== 'activities') selectedActivity = null;
  ui.list.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  ui.status.textContent = ''; ui.routeMeta.textContent = ''; ui.routeLinks.hidden = true;
  resultsLayer.clearLayers(); routeLayer.clearLayers();
}

// HTTP helper
async function post(path, body){
  const r = await fetch(`${PROXY}${path}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// Deep-links
function gmLink({oLat,oLng,dLat,dLng,query,placeId,mode}){
  const base = 'https://www.google.com/maps/dir/?api=1';
  const p = new URLSearchParams({ travelmode: mode || 'driving', language:'he' });
  if (oLat!=null && oLng!=null) p.set('origin', `${oLat},${oLng}`);
  if (placeId) { p.set('destination_place_id', placeId); if (query) p.set('destination', query); }
  else if (dLat!=null && dLng!=null) { p.set('destination', `${dLat},${dLng}`); }
  else if (query) { p.set('destination', query); }
  return `${base}&${p.toString()}`;
}
function wzLink({dLat,dLng,query}){
  if (dLat!=null && dLng!=null) return `https://www.waze.com/ul?ll=${dLat},${dLng}&navigate=yes&zoom=17`;
  if (query) return `waze://?q=${encodeURIComponent(query)}&navigate=yes`;
  return '#';
}
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

// Autocomplete (proxy)
let acToken = Math.random().toString(36).slice(2);
async function doAutocomplete(){
  const q = ui.dest.value.trim();
  if (!q){ ui.acList.hidden=true; ui.acList.innerHTML=''; return; }
  try{
    const j = await post('/autocomplete', { input:q, language:'he', sessionToken: acToken });
    const preds = j.predictions || [];
    ui.acList.innerHTML = '';
    preds.slice(0,6).forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p.description;
      btn.role = 'option';
      btn.onclick = ()=> { ui.dest.value = p.description; ui.acList.hidden = true; };
      ui.acList.appendChild(btn);
    });
    ui.acList.hidden = preds.length === 0;
  }catch(e){ ui.acList.hidden = true; }
}

// Activities mapping (client-side)
function mapActivityToQuery(sub){
  switch(sub){
    case 'water':   return { type:'tourist_attraction', keyword:'boat tour|sail|kayak|canoe|paddle|rent boat' };
    case 'hike':    return { type:'tourist_attraction', keyword:'trail|hike|viewpoint|panorama' };
    case 'bike':    return { type:'bicycle_store', keyword:'bike rental|mtb|e-bike|bicycle rental' };
    case 'museum':  return { type:'museum', keyword:'' };
    case 'park':    return { type:'park', keyword:'beach|lakeside' };
    case 'amusement': return { type:'amusement_park', keyword:'water park|theme park' };
    case 'spa':     return { type:'spa', keyword:'thermal|terme|spa' };
    case 'kids':    return { type:'tourist_attraction', keyword:'family friendly|kids' };
    default:        return { type:'point_of_interest', keyword:'' };
  }
}

// Places search
function buildPlaceQuery(){
  const v = ui.intent();
  let type = 'point_of_interest', keyword = '';
  if (v==='pizza'){ type='restaurant'; keyword='pizza|pizzeria'; }
  else if (v==='gelato'){ type='ice_cream'; keyword='gelato|ice cream'; }
  else if (v==='viewpoints'){ type='tourist_attraction'; keyword='viewpoint|panorama|scenic'; }
  else if (v==='food'){ type='restaurant'; }
  else if (v==='activities' && selectedActivity){ const m = mapActivityToQuery(selectedActivity); type=m.type; keyword=m.keyword; }
  const c = map.getCenter();
  return { lat:c.lat, lng:c.lng, openNow: ui.openNow(), radius: ui.radius(), language:'he',
           type, keyword, minRating: ui.minRating(), maxResults: 12 };
}

async function doPlaces(){
  try {
    ui.status.textContent = 'מחפש…';
    resultsLayer.clearLayers();
    ui.list.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    const q = buildPlaceQuery();
    const j = await post('/places', q);
    const items = j.items || [];
    ui.status.textContent = items.length ? `נמצאו ${items.length} תוצאות` : 'לא נמצאו תוצאות';
    ui.list.innerHTML = '';
    const group = L.featureGroup();
    items.forEach(renderPlaceCard);
    resultsLayer.eachLayer(m => group.addLayer(m));
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.2));
  } catch (e) {
    ui.status.textContent = 'שגיאה בחיפוש.';
  }
}

function renderPlaceCard(p){
  const div = document.createElement('div');
  div.className = 'result';
  const here = map.getCenter();
  const distKm = (p.lat!=null && p.lng!=null) ? (map.distance(here, L.latLng(p.lat,p.lng))/1000).toFixed(1) : null;
  const rating = (p.rating ? `${p.rating.toFixed(1)}⭐` : 'N/A') + (p.userRatingsTotal ? ` · ${p.userRatingsTotal} ביקורות` : '');
  const open = (p.openNow == null) ? '' : (p.openNow ? ' · פתוח עכשיו' : ' · סגור עכשיו');
  if (p.lat!=null && p.lng!=null){ L.marker([p.lat,p.lng]).bindPopup(p.name).addTo(resultsLayer); }
  div.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center">
      <h3>${p.name}</h3>
      <button class="fav" aria-label="מועדף">${isFav(p) ? '★' : '☆'}</button>
    </div>
    <div class="muted">${p.address || ''}</div>
    <div class="muted small">${rating}${open}${distKm?` · ~${distKm} ק״מ`:''}</div>
    <div class="row" style="margin-top:6px">
      <button class="primary gbtn">נווט בגוגל</button>
      <button class="wbtn">נווט ב-Waze</button>
      <button class="mapbtn">על המפה</button>
    </div>
  `;
  div.querySelector('.gbtn').onclick = () => window.open(gmLink({ oLat: here.lat, oLng: here.lng, dLat: p.lat, dLng: p.lng, query: p.name }), '_blank');
  div.querySelector('.wbtn').onclick = () => window.open(wzLink({ dLat: p.lat, dLng: p.lng, query: p.name }), '_blank');
  div.querySelector('.mapbtn').onclick = () => { if (p.lat!=null && p.lng!=null) { map.setView([p.lat,p.lng], 16); L.marker([p.lat,p.lng]).addTo(resultsLayer).bindPopup(p.name).openPopup(); } };
  div.querySelector('.fav').onclick = () => { toggleFav(p); renderFavs(); div.querySelector('.fav').textContent = isFav(p) ? '★' : '☆'; };
  document.getElementById('list').appendChild(div);
}

// Route with weather compare
function decodePolyline(str){
  let index=0, lat=0, lng=0, coords=[];
  while (index < str.length) {
    let b, shift=0, result=0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat; shift=0; result=0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

async function doRoute(){
  const q = ui.dest.value.trim();
  if (!q) { ui.routeMeta.textContent = 'נא להקליד יעד.'; return; }
  ui.routeMeta.textContent = 'מחשב מסלול…';
  routeLayer.clearLayers();
  try {
    const origin = map.getCenter();
    const m = ui.travelMode(); // 'driving' | 'transit'
    const g = await post('/geocode', { query: q, language: 'he' });
    const dest = { lat: g.result.lat, lng: g.result.lng };
    const r = await post('/route', { origin, dest, mode: m, language: 'he' });
    ui.routeMeta.innerHTML = `🧭 זמן: <b>${r.durationText||''}</b> · מרחק: <b>${r.distanceText||''}</b>`;
    if (r.polyline) {
      const coords = decodePolyline(r.polyline);
      const poly = L.polyline(coords, {weight:5}).addTo(routeLayer);
      map.fitBounds(poly.getBounds().pad(0.2));
    }
    const gmaps = gmLink({ oLat: origin.lat, oLng: origin.lng, dLat: dest.lat, dLng: dest.lng, query: q, mode: m==='transit'?'transit':'driving' });
    const waze  = (m==='driving') ? wzLink({ dLat: dest.lat, dLng: dest.lng, query: q }) : null;
    ui.routeLinks.hidden = false;
    ui.routeGmapsBtn.onclick = ()=> window.open(gmaps,'_blank');
    ui.routeWazeBtn.onclick  = ()=> waze ? window.open(waze,'_blank') : alert('Waze תומך בניווט רכב בלבד');

    // Weather advice
    try {
      const wxBox = document.getElementById('wxCheck');
      const wxAdvice = document.getElementById('wxAdvice');
      if (wxBox && wxBox.checked && wxAdvice){
        wxAdvice.textContent = 'בודק מז"א...';
        const [wHere, wDest] = await Promise.all([
          getWeather(origin.lat, origin.lng),
          getWeather(dest.lat, dest.lng)
        ]);
        wxAdvice.textContent = adviseWeather(wHere, wDest, {src:'כאן', dst:'ביעד'});
      }
    } catch(e){ const wxAdvice = document.getElementById('wxAdvice'); if (wxAdvice) wxAdvice.textContent = 'לא הצלחתי להביא מז"א.'; }

  } catch (e) {
    ui.routeMeta.textContent = 'שגיאה במסלול.';
    ui.routeLinks.hidden = true;
  }
}

// Favorites
const FAV_KEY = "roamwise_favs_v1";
function getFavs(){ try { return JSON.parse(localStorage.getItem(FAV_KEY)||"[]"); } catch { return []; } }
function saveFavs(arr){ localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }
function isFav(p){ return getFavs().some(x => x.id === p.id); }
function toggleFav(p){
  const arr = getFavs();
  const i = arr.findIndex(x => x.id === p.id);
  if (i>=0) arr.splice(i,1); else arr.push(p);
  saveFavs(arr);
}
function renderFavs(){
  const arr = getFavs();
  ui.favList.innerHTML = '';
  if (!arr.length) { ui.favList.textContent = 'אין מועדפים עדיין'; return; }
  arr.forEach(p => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.margin = '6px 0';
    row.innerHTML = `
      <span>★ ${p.name}</span>
      <span class="muted small"> · ${p.rating?`${p.rating.toFixed(1)}⭐`:''}</span>
      <button class="primary">פתח</button>
      <button>הסר</button>
    `;
    row.querySelector('button.primary').onclick = () => {
      if (p.lat!=null && p.lng!=null) { map.setView([p.lat,p.lng], 16); L.marker([p.lat,p.lng]).addTo(resultsLayer).bindPopup(p.name).openPopup(); }
    };
    row.querySelector('button:last-child').onclick = () => { toggleFav(p); renderFavs(); };
    ui.favList.appendChild(row);
  });
}
renderFavs();

// ChatGPT NLU — /think
async function doThink(){
  const text = ui.freeText.value.trim();
  if (!text){ ui.thinkStatus.textContent = 'כתוב משהו…'; return; }
  ui.thinkStatus.textContent = 'חושב…';
  try{
    const res = await post('/think', { text, context: { locale:'he-IL' } });
    ui.thinkStatus.textContent = '';
    // route
    if (res.intent === 'route'){
      setIntent('route'); ui.dest.value = res.destinationText || ''; 
      if (res.mode) document.getElementById('travelMode').value = res.mode;
      if (ui.dest.value) doRoute(); else ui.routeBox.hidden = false;
      return;
    }
    // activities
    if (res.intent === 'activities'){
      setIntent('activities'); selectedActivity = res.subcategory || null;
      if (res.filters){ document.getElementById('openNow').checked = !!res.filters.openNow; if (res.filters.minRating) document.getElementById('minRating').value = String(res.filters.minRating); }
      doPlaces(); return;
    }
    // places generic
    setIntent(res.intent === 'viewpoints' ? 'viewpoints' : (res.intent==='gelato' ? 'gelato' : (res.intent==='pizza' ? 'pizza' : 'food')));
    if (res.filters){ document.getElementById('openNow').checked = !!res.filters.openNow; if (res.filters.minRating) document.getElementById('minRating').value = String(res.filters.minRating); }
    doPlaces();
  }catch(e){
    ui.thinkStatus.textContent = 'שגיאת NLU';
  }
}

// --- AI Functionality ---
let userId = localStorage.getItem('roamwise_user_id') || (() => {
  const id = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('roamwise_user_id', id);
  return id;
})();

let speechRecognition = null;
let speechSynthesis = window.speechSynthesis;
let isListening = false;
let isSpeaking = false;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  speechRecognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;
  speechRecognition.lang = 'he-IL';

  speechRecognition.onstart = () => {
    isListening = true;
    ui.voiceBtn.classList.add('listening');
    ui.voiceBtn.textContent = '🎤 מקשיב...';
    ui.voiceStatus.textContent = 'מקשיב...';
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    processVoiceInput(transcript);
  };

  speechRecognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    ui.voiceStatus.textContent = 'שגיאה בזיהוי קול';
    resetVoiceButton();
  };

  speechRecognition.onend = () => {
    resetVoiceButton();
  };
}

function startVoiceInput() {
  if (!speechRecognition) {
    ui.voiceStatus.textContent = 'זיהוי קול לא נתמך בדפדפן זה';
    return;
  }

  if (isListening) {
    speechRecognition.stop();
    return;
  }

  try {
    speechRecognition.start();
  } catch (error) {
    console.error('Error starting speech recognition:', error);
    ui.voiceStatus.textContent = 'שגיאה בהפעלת זיהוי קול';
  }
}

function resetVoiceButton() {
  isListening = false;
  ui.voiceBtn.classList.remove('listening');
  ui.voiceBtn.textContent = '🎤 דבר עם RoamWise';
  if (!isSpeaking) {
    ui.voiceStatus.textContent = '';
  }
}

// Text-to-Speech function
function speakText(text, lang = 'he-IL') {
  if (!speechSynthesis) {
    console.log('Text-to-speech not supported');
    return;
  }

  // Stop any current speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;

  utterance.onstart = () => {
    isSpeaking = true;
    ui.voiceStatus.textContent = '🔊 RoamWise מדבר...';
  };

  utterance.onend = () => {
    isSpeaking = false;
    if (!isListening) {
      ui.voiceStatus.textContent = '';
    }
  };

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    isSpeaking = false;
    ui.voiceStatus.textContent = 'שגיאה בדיבור';
  };

  // Try to find Hebrew voice
  const voices = speechSynthesis.getVoices();
  const hebrewVoice = voices.find(voice => voice.lang.includes('he'));
  if (hebrewVoice) {
    utterance.voice = hebrewVoice;
  }

  speechSynthesis.speak(utterance);
}

async function processVoiceInput(transcript) {
  ui.voiceStatus.textContent = 'מעבד...';
  ui.voiceResponse.hidden = false;
  ui.voiceResponse.textContent = `שמעתי: "${transcript}"`;

  try {
    const center = map.getCenter();
    const response = await post('/voice-to-intent', {
      text: transcript,
      userId,
      location: { lat: center.lat, lng: center.lng }
    });

    ui.voiceResponse.innerHTML = `
      <div><strong>שמעתי:</strong> "${transcript}"</div>
      <div><strong>תגובה:</strong> ${response.conversationResponse}</div>
      <button onclick="speakText('${response.conversationResponse.replace(/'/g, "\\'")}')" class="small secondary" style="margin-top: 8px;">🔊 השמע תגובה</button>
    `;

    // Automatically speak the response
    setTimeout(() => speakText(response.conversationResponse), 500);

    // Track the voice interaction
    await post('/track-interaction', {
      userId,
      placeId: 'voice_' + Date.now(),
      interactionType: 'voice_query',
      rating: null
    });

    // If AI recommendations were triggered, display them
    if (response.actionResult?.recommendations) {
      displayAIRecommendations(response.actionResult.recommendations, response.actionResult.context);
      
      // Speak summary of recommendations
      const recCount = response.actionResult.recommendations.length;
      if (recCount > 0) {
        setTimeout(() => {
          speakText(`מצאתי ${recCount} המלצות עבורך. בדוק את המסך לפרטים נוספים.`);
        }, 3000);
      }
    }

    ui.voiceStatus.textContent = 'הושלם!';
  } catch (error) {
    console.error('Voice processing error:', error);
    ui.voiceResponse.textContent = 'שגיאה בעיבוד הקול';
    ui.voiceStatus.textContent = 'שגיאה';
  }
}

async function getAIRecommendations() {
  ui.aiRecommendBtn.textContent = '⏳ מחפש המלצות...';
  ui.aiRecommendBtn.disabled = true;

  try {
    const center = map.getCenter();
    const mood = ui.moodSelect.value;
    
    const response = await post('/ai-recommendations', {
      lat: center.lat,
      lng: center.lng,
      userId,
      mood,
      timeOfDay: getTimeOfDay(),
      companionType: 'solo' // Could be enhanced with user input
    });

    displayAIRecommendations(response.recommendations, response.context);
    
    // Track the AI recommendation request
    await post('/track-interaction', {
      userId,
      placeId: 'ai_recommendations_' + Date.now(),
      interactionType: 'ai_request',
      rating: null
    });

    ui.aiRecommendBtn.textContent = '✨ קבל המלצות מותאמות אישית';
  } catch (error) {
    console.error('AI recommendations error:', error);
    ui.aiRecommendations.innerHTML = '<div class="ai-recommendation">שגיאה בטעינת המלצות. נסה שוב.</div>';
    ui.aiRecommendations.hidden = false;
    ui.aiRecommendBtn.textContent = '✨ קבל המלצות מותאמות אישית';
  } finally {
    ui.aiRecommendBtn.disabled = false;
  }
}

function displayAIRecommendations(recommendations, context) {
  if (!recommendations || recommendations.length === 0) {
    ui.aiRecommendations.innerHTML = '<div class="ai-recommendation">לא נמצאו המלצות עבור המצב הנוכחי. נסה לשנות את מצב הרוח או המיקום.</div>';
    ui.aiRecommendations.hidden = false;
    return;
  }

  let html = `<div class="ai-context">
    <strong>🎯 הקשר:</strong> מצב רוח: ${getMoodEmoji(context.mood)}, מזג אוויר: ${Math.round(context.weather?.temperature_2m || 0)}°C
  </div>`;

  recommendations.forEach(rec => {
    html += `<div class="ai-recommendation">
      <h4>${getCategoryEmoji(rec.category)} ${getCategoryName(rec.category)}</h4>
      <div class="reason">${rec.reason}</div>`;
    
    rec.places.forEach(place => {
      html += `<div class="place" onclick="showPlaceOnMap(${place.lat}, ${place.lng}, '${place.name}')">
        <div class="place-name">${place.name}</div>
        <div class="place-details">
          ${place.rating ? `⭐ ${place.rating}` : ''} 
          ${place.address ? `• ${place.address}` : ''}
          ${place.openNow !== undefined ? (place.openNow ? ' • פתוח עכשיו' : ' • סגור עכשיו') : ''}
        </div>
      </div>`;
    });
    
    html += '</div>';
  });

  ui.aiRecommendations.innerHTML = html;
  ui.aiRecommendations.hidden = false;
}

function showPlaceOnMap(lat, lng, name) {
  map.setView([lat, lng], 16);
  L.marker([lat, lng]).addTo(resultsLayer).bindPopup(name).openPopup();
}

function getMoodEmoji(mood) {
  const moods = {
    neutral: '😐 רגיל',
    adventurous: '🗺️ הרפתקני', 
    relaxed: '😌 רגוע',
    social: '👥 חברותי',
    romantic: '💕 רומנטי',
    hungry: '🍽️ רעב',
    curious: '🔍 סקרן'
  };
  return moods[mood] || mood;
}

function getCategoryEmoji(category) {
  const categories = {
    restaurant: '🍽️',
    tourist_attraction: '🏛️',
    spa: '🧘',
    museum: '🏛️',
    ice_cream: '🍦'
  };
  return categories[category] || '📍';
}

function getCategoryName(category) {
  const names = {
    restaurant: 'מסעדות',
    tourist_attraction: 'אטרקציות',
    spa: 'ספא ורווחה',
    museum: 'מוזיאונים',
    ice_cream: 'גלידה'
  };
  return names[category] || category;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function onMoodChange() {
  // Could trigger automatic recommendations based on mood change
  const mood = ui.moodSelect.value;
  console.log('Mood changed to:', mood);
}

function toggleAISettings() {
  // Future: Show AI settings panel
  alert('הגדרות AI - בקרוב!');
}

function showVoiceHelp() {
  const helpText = `
🎤 דוגמאות לפקודות קוליות:

• "אני רוצה גלידה עם נוף יפה"
• "מצא לי מסעדה רומנטית לארוחת ערב"
• "איפה יש מוזיאון בקרבת מקום?"
• "מה יש לעשות פה בגשם?"
• "אני מחפש משהו הרפתקני"
• "תכנן לי מסלול לתחנה המרכזית"

הלחץ על כפתור המיקרופון ודבר בעברית! 
RoamWise יבין אותך ויענה גם בקול.
  `;
  
  ui.voiceResponse.innerHTML = `<div style="white-space: pre-line;">${helpText}</div>`;
  ui.voiceResponse.hidden = false;
  
  speakText('אני RoamWise, העוזר החכם שלך לטיולים. תוכל לדבר איתי בעברית ולבקש המלצות על מקומות, מסעדות ופעילויות. נסה לומר משהו כמו: מצא לי גלידה עם נוף יפה!');
}

// Smart Notifications
async function checkSmartNotifications() {
  try {
    const center = map.getCenter();
    const response = await post('/smart-notifications', {
      userId,
      location: { lat: center.lat, lng: center.lng },
      timeContext: { hour: new Date().getHours() }
    });

    displaySmartNotifications(response.notifications);
  } catch (error) {
    console.error('Smart notifications error:', error);
  }
}

function displaySmartNotifications(notifications) {
  if (!notifications || notifications.length === 0) {
    ui.smartNotifications.hidden = true;
    return;
  }

  let html = '';
  notifications.forEach(notif => {
    html += `<div class="notification ${notif.priority}">
      <div class="notification-title">${notif.title}</div>
      <div class="notification-message">${notif.message}</div>
      ${notif.action ? `<button class="notification-action" onclick="handleNotificationAction('${notif.action}', ${JSON.stringify(notif.params).replace(/"/g, '&quot;')})">פעל</button>` : ''}
    </div>`;
  });

  ui.smartNotifications.innerHTML = html;
  ui.smartNotifications.hidden = false;
}

function handleNotificationAction(action, params) {
  if (action === 'ai_recommendations') {
    // Set mood if provided and get recommendations
    if (params.mood) {
      ui.moodSelect.value = params.mood;
    }
    getAIRecommendations();
  }
}

// Initialize smart notifications check
setInterval(checkSmartNotifications, 5 * 60 * 1000); // Every 5 minutes
// Check immediately after location is obtained
setTimeout(checkSmartNotifications, 3000);

// --- Weather helpers ---
async function getWeather(lat, lng){
  const r = await fetch(`${PROXY}/weather`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ lat, lng })
  });
  if (!r.ok) throw new Error('weather');
  const j = await r.json();
  return j.weather;
}

function rainScore(w){
  if (!w) return 0;
  let near6 = 0;
  if (w.hourly?.precipitation_probability && w.hourly?.time){
    const now = new Date();
    const idxs = [];
    for (let i=0; i<w.hourly.time.length; i++){
      const t = new Date(w.hourly.time[i]);
      if (t >= now && idxs.length < 6) idxs.push(i);
    }
    if (idxs.length){
      near6 = Math.max(...idxs.map(i => w.hourly.precipitation_probability[i] ?? 0));
    }
  }
  let todaySum = 0;
  if (w.daily?.precipitation_sum && w.daily?.time){
    todaySum = w.daily.precipitation_sum[0] ?? 0;
  }
  return near6 + (todaySum * 10);
}

function adviseWeather(srcW, dstW, names={src:'כאן', dst:'ביעד'}){
  const s1 = rainScore(srcW), s2 = rainScore(dstW);
  const diff = s2 - s1;
  const arrow = diff <= -10 ? '⬇️' : diff >= 10 ? '⬆️' : '↔️';
  let call = '';
  if (diff <= -10) call = `כדאי לנסוע: יבש יותר ${names.dst}.`;
  else if (diff >= 10) call = `שקול דחייה/תכנית חלופית: צפוי רטוב יותר ${names.dst}.`;
  else call = `דומה בשניהם.`;
  const cur = (w)=> w?.current ? `${Math.round(w.current.temperature_2m)}°C` : '—';
  return `${arrow} ${call} עכשיו ${names.src}: ${cur(srcW)} · ${names.dst}: ${cur(dstW)} (מדד גשם ${Math.round(s1)}→${Math.round(s2)}).`;
}

// Weather Card (current location)
async function updateWeatherCard(lat, lng){
  const w = await getWeather(lat, lng);
  if (!w){ ui.wxDesc.textContent = 'אין נתונים'; return; }
  const t = Math.round(w.current?.temperature_2m ?? 0);
  const hi = w.daily?.temperature_2m_max?.[0];
  const lo = w.daily?.temperature_2m_min?.[0];
  const pop6 = (()=>{
    if (!w.hourly?.precipitation_probability) return null;
    let acc = 0, c=0;
    for (let i=0;i<6 && i<w.hourly.precipitation_probability.length;i++){ acc += (w.hourly.precipitation_probability[i]||0); c++; }
    return c? Math.round(acc/c) : null;
  })();
  ui.wxTemp.textContent = `${t}°`;
  ui.wxDesc.textContent = (w.current?.is_day? 'יום' : 'לילה') + (pop6!=null? ` · גשם בשש השעות הקרובות ~${pop6}%` : '');
  ui.wxHiLo.textContent = `H:${hi!=null?Math.round(hi):'—'}° · L:${lo!=null?Math.round(lo):'—'}°`;
  ui.wxNext.textContent = 'טיפ: גרור את המפה לאזור אחר ולחץ רענן כדי לראות מז״א שם.';
}

// Weather-Aware Trip Planning Functions
async function updateTripPlanningWeather(lat, lng) {
  try {
    const weatherData = await getWeather(lat, lng);
    currentWeatherData = weatherData;
    
    // Update current weather display in trip planning
    const currentWeatherEl = document.getElementById('currentWeather');
    if (currentWeatherEl && weatherData?.current) {
      const temp = Math.round(weatherData.current.temperature_2m || 0);
      const isDay = weatherData.current.is_day;
      const weatherIcon = getWeatherIcon(weatherData.current, isDay);
      const weatherDesc = getWeatherDescription(weatherData.current, isDay);
      
      currentWeatherEl.innerHTML = `
        <span class="weather-icon">${weatherIcon}</span>
        <span class="weather-temp">${temp}°C</span>
        <span class="weather-desc">${weatherDesc}</span>
      `;
    }
    
    // Update weather forecast
    await updateWeatherForecast(weatherData);
    
    // Update weather recommendations
    updateWeatherRecommendations(weatherData);
    
  } catch (error) {
    console.error('Error updating trip planning weather:', error);
    const currentWeatherEl = document.getElementById('currentWeather');
    if (currentWeatherEl) {
      currentWeatherEl.innerHTML = `
        <span class="weather-icon">⚠️</span>
        <span class="weather-temp">--°</span>
        <span class="weather-desc">שגיאה בטעינת מזג אוויר</span>
      `;
    }
  }
}

async function updateWeatherForecast(weatherData) {
  const forecastEl = document.getElementById('weatherForecast');
  if (!forecastEl || !weatherData?.daily) return;
  
  try {
    const daily = weatherData.daily;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's forecast
    const todayTemp = daily.temperature_2m_max?.[0] ? Math.round(daily.temperature_2m_max[0]) : '--';
    const todayIcon = getWeatherIconForDaily(daily, 0);
    const todayRec = getWeatherRecommendation(daily, 0);
    
    // Tomorrow's forecast  
    const tomorrowTemp = daily.temperature_2m_max?.[1] ? Math.round(daily.temperature_2m_max[1]) : '--';
    const tomorrowIcon = getWeatherIconForDaily(daily, 1);
    const tomorrowRec = getWeatherRecommendation(daily, 1);
    
    forecastEl.innerHTML = `
      <div class="forecast-day">
        <span class="day-label">היום</span>
        <span class="day-weather">${todayIcon} ${todayTemp}°</span>
        <span class="day-recommendation">${todayRec}</span>
      </div>
      <div class="forecast-day">
        <span class="day-label">מחר</span>
        <span class="day-weather">${tomorrowIcon} ${tomorrowTemp}°</span>
        <span class="day-recommendation">${tomorrowRec}</span>
      </div>
    `;
    
    weatherForecastData = { today: daily, todayTemp, tomorrowTemp };
    
  } catch (error) {
    console.error('Error updating weather forecast:', error);
    forecastEl.innerHTML = `
      <div class="forecast-day">
        <span class="day-label">שגיאה</span>
        <span class="day-weather">⚠️ --°</span>
        <span class="day-recommendation">לא ניתן לטעון תחזית</span>
      </div>
    `;
  }
}

function getWeatherIcon(current, isDay) {
  if (!current) return '🌤️';
  
  const temp = current.temperature_2m || 0;
  const precipitation = current.precipitation || 0;
  const windSpeed = current.wind_speed_10m || 0;
  
  if (precipitation > 5) return '🌧️';
  if (precipitation > 0.5) return '🌦️';
  if (windSpeed > 20) return '💨';
  if (temp > 30) return '🌡️';
  if (temp < 5) return '🥶';
  if (isDay) return temp > 25 ? '☀️' : '🌤️';
  return '🌙';
}

function getWeatherDescription(current, isDay) {
  if (!current) return 'לא ידוע';
  
  const temp = current.temperature_2m || 0;
  const precipitation = current.precipitation || 0;
  
  if (precipitation > 5) return 'גשום';
  if (precipitation > 0.5) return 'טפטופים';
  if (temp > 30) return 'חם מאוד';
  if (temp < 5) return 'קר מאוד';
  if (temp > 25) return isDay ? 'נעים וחם' : 'לילה נעים';
  if (temp > 15) return isDay ? 'נעים' : 'לילה קריר';
  return isDay ? 'קריר' : 'לילה קר';
}

function getWeatherIconForDaily(daily, dayIndex) {
  if (!daily.temperature_2m_max || !daily.precipitation_sum) return '🌤️';
  
  const temp = daily.temperature_2m_max[dayIndex] || 0;
  const precipitation = daily.precipitation_sum[dayIndex] || 0;
  
  if (precipitation > 5) return '🌧️';
  if (precipitation > 0.5) return '🌦️';
  if (temp > 30) return '🌡️';
  if (temp < 5) return '🥶';
  if (temp > 25) return '☀️';
  return '🌤️';
}

function getWeatherRecommendation(daily, dayIndex) {
  if (!daily.temperature_2m_max || !daily.precipitation_sum) return 'תחזית לא זמינה';
  
  const temp = daily.temperature_2m_max[dayIndex] || 0;
  const precipitation = daily.precipitation_sum[dayIndex] || 0;
  
  if (precipitation > 5) return 'מומלץ מקומות מקורים';
  if (precipitation > 0.5) return 'קח מטרייה';
  if (temp > 30) return 'הישאר בצל, שתה הרבה';
  if (temp < 5) return 'התלבש חם';
  if (temp > 25) return 'מושלם לטיול חוץ';
  if (temp > 15) return 'מזג אוויר נעים';
  return 'קח ז\'קט';
}

function updateWeatherRecommendations(weatherData) {
  const weatherOptimized = document.getElementById('weatherOptimized');
  if (!weatherOptimized) return;
  
  // Add event listener if not already added
  if (!weatherOptimized.hasAttribute('data-listener-added')) {
    weatherOptimized.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      console.log('Weather optimization:', isChecked ? 'enabled' : 'disabled');
      
      // Update UI to show weather considerations
      const planningCard = document.querySelector('.weather-planning-card');
      if (planningCard) {
        planningCard.classList.toggle('weather-active', isChecked);
      }
    });
    weatherOptimized.setAttribute('data-listener-added', 'true');
  }
}

function getWeatherBasedTripRecommendations(weatherData, tripPreferences) {
  if (!weatherData?.current) return tripPreferences;
  
  const temp = weatherData.current.temperature_2m || 20;
  const precipitation = weatherData.current.precipitation || 0;
  const windSpeed = weatherData.current.wind_speed_10m || 0;
  
  const recommendations = { ...tripPreferences };
  
  // Adjust based on weather conditions
  if (precipitation > 2) {
    // Rainy weather - prioritize indoor activities
    recommendations.weatherTips = [
      'בגלל הגשם, מומלץ לתכנן פעילויות מקורות',
      'בתי קפה, מוזיאונים ומרכזי קניות יהיו בחירה טובה',
      'אם יש הפסקה בגשם, נוכל לצאת לטיולים קצרים'
    ];
    recommendations.indoorPreference = true;
  } else if (temp > 30) {
    // Hot weather
    recommendations.weatherTips = [
      'מזג אוויר חם - מומלץ לתכנן פעילויות מוקדמות או מאוחרות',
      'חפש מקומות עם צל או מיזוג אוויר',
      'שתה הרבה מים ונח לעתים קרובות'
    ];
    recommendations.timePreference = 'early_or_late';
  } else if (temp < 5) {
    // Cold weather
    recommendations.weatherTips = [
      'מזג אוויר קר - התלבש חם ותכנן פעילויות מחממות',
      'מקומות חמים כמו בתי קפה ומסעדות יהיו נעימים',
      'טיולים קצרים עם התחממות תכופה'
    ];
    recommendations.indoorPreference = true;
  } else if (windSpeed > 15) {
    // Windy weather
    recommendations.weatherTips = [
      'רוח חזקה - הימנע מפעילויות חוץ גבוהות',
      'מקומות מוגנים יהיו נוחים יותר',
      'זהירות ממטריות וחפצים קלים'
    ];
  } else {
    // Good weather
    recommendations.weatherTips = [
      'מזג אוויר מעולה לטיולים!',
      'זה זמן מושלם לפעילויות חוץ',
      'נצל את המזג הטוב לחקור את האזור'
    ];
    recommendations.outdoorPreference = true;
  }
  
  return recommendations;
}

// Initialize trip planning interactions
function initTripPlanningInteractions() {
  // Duration selection buttons
  document.querySelectorAll('.duration-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update selection
      document.querySelectorAll('.duration-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      
      // Handle custom duration
      const duration = btn.dataset.duration;
      const customSlider = document.getElementById('customDuration');
      const durationDisplay = document.getElementById('durationDisplay');
      
      if (duration === 'custom') {
        if (customSlider) {
          customSlider.hidden = false;
          updateDurationDisplay(customSlider.value);
        }
      } else {
        if (customSlider) customSlider.hidden = true;
        if (durationDisplay) {
          const hours = parseInt(duration) || 8;
          if (hours >= 16) {
            durationDisplay.textContent = `${Math.floor(hours/24)} ימים נבחרו`;
          } else {
            durationDisplay.textContent = `${hours} שעות נבחרו`;
          }
        }
      }
    });
  });
  
  // Custom duration slider
  const customSlider = document.getElementById('customDuration');
  if (customSlider) {
    customSlider.addEventListener('input', (e) => {
      updateDurationDisplay(e.target.value);
    });
  }
  
  // Interest selection
  document.querySelectorAll('.interest-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const selectedCount = document.querySelectorAll('.interest-option.selected').length;
      const isSelected = btn.classList.contains('selected');
      
      if (isSelected) {
        btn.classList.remove('selected');
      } else if (selectedCount < 4) {
        btn.classList.add('selected');
      } else {
        // Show feedback that max 4 interests allowed
        showNotification('ניתן לבחור עד 4 תחומי עניין', 'info');
      }
    });
  });
  
  // Budget slider
  const budgetSlider = document.getElementById('budgetRange');
  const budgetAmount = document.getElementById('budgetAmount');
  if (budgetSlider && budgetAmount) {
    budgetSlider.addEventListener('input', (e) => {
      budgetAmount.textContent = e.target.value;
    });
  }
  
  // Trip template selection
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const template = card.dataset.template;
      
      // Apply template settings
      applyTripTemplate(template);
      
      // Visual feedback
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
      
      showNotification(`תבנית "${card.querySelector('.template-title').textContent}" נבחרה`, 'success');
    });
  });
}

function updateDurationDisplay(hours) {
  const display = document.getElementById('durationDisplay');
  if (!display) return;
  
  const h = parseInt(hours) || 8;
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const remainingHours = h % 24;
    if (remainingHours > 0) {
      display.textContent = `${days} ימים ו-${remainingHours} שעות נבחרו`;
    } else {
      display.textContent = `${days} ימים נבחרו`;
    }
  } else {
    display.textContent = `${h} שעות נבחרו`;
  }
}

function applyTripTemplate(template) {
  // Clear current selections
  document.querySelectorAll('.interest-option.selected').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Apply template-specific interests
  const templateInterests = {
    romantic: ['gourmet', 'nature'],
    family: ['nature', 'history'],
    adventure: ['nature', 'shopping'],
    cultural: ['history', 'art']
  };
  
  const interests = templateInterests[template] || [];
  interests.forEach(interest => {
    const btn = document.querySelector(`[data-interest="${interest}"]`);
    if (btn) btn.classList.add('selected');
  });
  
  // Apply template-specific budget
  const templateBudgets = {
    romantic: 500,
    family: 400,
    adventure: 350,
    cultural: 300
  };
  
  const budget = templateBudgets[template] || 300;
  const budgetSlider = document.getElementById('budgetRange');
  const budgetAmount = document.getElementById('budgetAmount');
  if (budgetSlider && budgetAmount) {
    budgetSlider.value = budget;
    budgetAmount.textContent = budget;
  }
}

// Helper function for getting user ID
function getUserId() {
  return localStorage.getItem('roamwise_user_id') || 'anonymous_user';
}

// Helper function for tracking interactions (if not already defined)
function trackInteraction(placeId, interactionType, metadata = {}) {
  console.log('Tracking interaction:', { placeId, interactionType, metadata });
  // This would typically send data to analytics service
}

// Trip Planning Functionality
let currentTrip = null;
let currentActivity = 0;
let selectedInterests = [];

// Weather-aware trip planning variables
let currentWeatherData = null;
let weatherForecastData = null;

// Trip planning event listeners
ui.tripToggle.addEventListener('click', () => {
  const isHidden = ui.tripPlanForm.hidden;
  ui.tripPlanForm.hidden = !isHidden;
  ui.tripToggle.textContent = isHidden ? '📋' : '❌';
});

ui.tripDuration.addEventListener('change', (e) => {
  ui.customHoursField.hidden = e.target.value !== 'custom';
});

// Interest chips selection
document.querySelectorAll('.interest-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.preventDefault();
    const interest = e.target.dataset.interest;
    if (selectedInterests.includes(interest)) {
      selectedInterests = selectedInterests.filter(i => i !== interest);
      e.target.classList.remove('selected');
    } else {
      selectedInterests.push(interest);
      e.target.classList.add('selected');
    }
  });
});

// Add event listener for enhanced trip generation
document.getElementById('generateTripBtn')?.addEventListener('click', async () => {
  const center = map.getCenter();
  
  document.getElementById('generateTripBtn').disabled = true;
  document.getElementById('generateTripBtn').innerHTML = `
    <span class="btn-icon">⏳</span>
    <span class="btn-text">מייצר טיול חכם</span>
    <span class="btn-subtitle">כולל התחשבות במזג האוויר</span>
  `;
  document.getElementById('tripGenerationStatus').textContent = 'מתכנן טיול מותאם אישית עם מזג אוויר...';

  try {
    // Get selected preferences
    const duration = getDurationHours();
    const interests = getSelectedInterests();
    const budget = document.getElementById('budgetRange')?.value || 300;
    const groupType = document.getElementById('groupType')?.value || 'couple';
    const groupSize = parseInt(document.getElementById('groupSize')?.value) || 2;
    const weatherOptimized = document.getElementById('weatherOptimized')?.checked || false;
    
    // Get weather considerations if enabled
    let weatherConsiderations = {};
    if (weatherOptimized && currentWeatherData) {
      weatherConsiderations = getWeatherBasedTripRecommendations(currentWeatherData, {
        duration,
        interests,
        budget,
        groupType
      });
    }
    
    const response = await fetch(`${PROXY}/plan-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLocation: { lat: center.lat, lng: center.lng },
        duration,
        interests,
        budget: parseInt(budget),
        groupSize,
        groupType,
        weatherOptimized,
        weatherData: weatherOptimized ? currentWeatherData : null,
        weatherConsiderations: weatherOptimized ? weatherConsiderations : null,
        userId: getUserId()
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      currentTrip = data.tripPlan;
      currentActivity = 0;
      displayEnhancedTripPlan(data.tripPlan, data.tripId);
      document.getElementById('tripGenerationStatus').textContent = `נוצר טיול מושלם עם התחשבות במזג האוויר! 🎯`;
      
      // Show the enhanced trip display
      document.getElementById('enhancedTripDisplay').hidden = false;
      
      // Track this interaction
      if (typeof trackInteraction === 'function') {
        trackInteraction('trip_planned', 'enhanced_plan_trip', { 
          duration, 
          interests,
          weatherOptimized,
          activities_count: data.tripPlan.activities.length 
        });
      }
    } else {
      document.getElementById('tripGenerationStatus').textContent = `שגיאה: ${data.error}`;
    }
  } catch (error) {
    document.getElementById('tripGenerationStatus').textContent = `שגיאה בתכנון: ${error.message}`;
    console.error('Trip planning error:', error);
  } finally {
    document.getElementById('generateTripBtn').disabled = false;
    document.getElementById('generateTripBtn').innerHTML = `
      <span class="btn-icon">🤖</span>
      <span class="btn-text">יצירת טיול חכם</span>
      <span class="btn-subtitle">בינה מלאכותית מתקדמת</span>
    `;
  }
});

function getDurationHours() {
  const durationBtns = document.querySelectorAll('.duration-option.selected');
  if (durationBtns.length > 0) {
    const selectedValue = durationBtns[0].dataset.duration;
    if (selectedValue === 'custom') {
      return parseInt(document.getElementById('customDuration')?.value) || 8;
    }
    return parseInt(selectedValue) || 8;
  }
  return 8;
}

function getSelectedInterests() {
  const selectedBtns = document.querySelectorAll('.interest-option.selected');
  const interests = [];
  selectedBtns.forEach(btn => {
    const interest = btn.dataset.interest;
    if (interest) interests.push(interest);
  });
  return interests;
}

function displayEnhancedTripPlan(tripPlan, tripId) {
  const display = document.getElementById('enhancedTripDisplay');
  if (!display) return;
  
  // Update trip overview
  document.getElementById('generatedTripTitle').textContent = tripPlan.title || 'הטיול שלך מוכן!';
  document.getElementById('tripDurationBadge').textContent = `${getDurationHours()} שעות`;
  document.getElementById('tripCostBadge').textContent = `${tripPlan.estimated_cost || document.getElementById('budgetRange')?.value || 300}₪`;
  document.getElementById('tripPlacesBadge').textContent = `${tripPlan.activities?.length || 0} מקומות`;
  
  // Update itinerary
  const itinerary = document.getElementById('tripItinerary');
  if (itinerary && tripPlan.activities) {
    itinerary.innerHTML = '';
    
    tripPlan.activities.forEach((activity, index) => {
      const activityEl = document.createElement('div');
      activityEl.className = `itinerary-item ${index === 0 ? 'current' : ''}`;
      activityEl.innerHTML = `
        <div class="itinerary-time">${activity.time || `${9 + index * 2}:00`}</div>
        <div class="itinerary-content">
          <div class="itinerary-title">${activity.name}</div>
          <div class="itinerary-description">${activity.description}</div>
          ${activity.place ? `
            <div class="itinerary-location">
              📍 ${activity.place.name}
              ${activity.place.rating ? `⭐ ${activity.place.rating}` : ''}
            </div>
          ` : ''}
        </div>
        <div class="itinerary-actions">
          <button class="itinerary-btn" onclick="navigateToActivity(${index})">🗺️</button>
          ${activity.place ? `<button class="itinerary-btn" onclick="viewOnMap(${activity.place.lat}, ${activity.place.lng})">👁️</button>` : ''}
        </div>
      `;
      itinerary.appendChild(activityEl);
    });
  }
  
  // Update insights
  if (tripPlan.insights) {
    document.getElementById('totalDuration').textContent = `${getDurationHours()} שעות`;
    document.getElementById('totalDistance').textContent = tripPlan.insights.totalDistance || '3.2 ק"מ';
    document.getElementById('avgRating').textContent = tripPlan.insights.avgRating || '4.3';
    document.getElementById('estimatedCost').textContent = `${tripPlan.estimated_cost || document.getElementById('budgetRange')?.value || 300}₪`;
  }
}

// Legacy support for old trip planning
ui.planTripBtn?.addEventListener('click', async () => {
  if (!here) {
    ui.tripPlanStatus.textContent = 'צריך מיקום תחילה - הפעל מיקום או לחץ על המפה';
    return;
  }

  ui.planTripBtn.disabled = true;
  ui.tripPlanStatus.textContent = 'מתכנן טיול מותאם אישית... 🤖';

  try {
    const duration = ui.tripDuration.value;
    const customHours = duration === 'custom' ? parseInt(ui.customHours.value) : undefined;
    
    const response = await fetch(`${PROXY}/plan-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLocation: { lat: here.lat, lng: here.lng },
        duration,
        customHours,
        interests: selectedInterests,
        budget: ui.tripBudget.value,
        groupSize: parseInt(ui.groupSize.value),
        mobility: ui.tripMobility.value,
        userId: getUserId()
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      currentTrip = data.tripPlan;
      currentActivity = 0;
      displayTripPlan(data.tripPlan, data.tripId);
      ui.tripPlanStatus.textContent = `נוצר טיול מושלם! 🎯`;
      
      // Track this interaction
      if (typeof trackInteraction === 'function') {
        trackInteraction('trip_planned', 'plan_trip', { 
          duration, 
          interests: selectedInterests,
          activities_count: data.tripPlan.activities.length 
        });
      }
    } else {
      ui.tripPlanStatus.textContent = `שגיאה: ${data.error}`;
    }
  } catch (error) {
    ui.tripPlanStatus.textContent = `שגיאה בתכנון: ${error.message}`;
  } finally {
    ui.planTripBtn.disabled = false;
  }
});

function displayTripPlan(tripPlan, tripId) {
  // Clear previous display
  ui.tripPlanDisplay.innerHTML = '';
  ui.tripPlanDisplay.hidden = false;

  // Trip overview
  const overview = document.createElement('div');
  overview.className = 'trip-overview';
  overview.innerHTML = `
    <div class="trip-title">${tripPlan.title}</div>
    <div class="trip-meta">
      <span>💰 ${tripPlan.estimated_cost}</span>
      <span>⏱️ ${tripPlan.activities.length} פעילויות</span>
      <span>📍 מטיול ${tripId.split('_')[1]}</span>
    </div>
    <div class="trip-description">${tripPlan.overview}</div>
  `;
  ui.tripPlanDisplay.appendChild(overview);

  // Activities
  const activitiesContainer = document.createElement('div');
  activitiesContainer.className = 'trip-activities';

  tripPlan.activities.forEach((activity, index) => {
    const activityEl = document.createElement('div');
    activityEl.className = `trip-activity ${index === currentActivity ? 'current' : ''}`;
    activityEl.innerHTML = `
      <div class="activity-header">
        <div class="activity-name">${activity.name}</div>
        <div class="activity-duration">${activity.duration_minutes}ד'</div>
      </div>
      <div class="activity-description">${activity.description}</div>
      ${activity.place ? `
        <div class="activity-place">
          <div class="place-info">
            <div class="place-name">${activity.place.name}</div>
            <div class="place-address">${activity.place.address}</div>
          </div>
          <div class="place-rating">⭐ ${activity.place.rating || 'N/A'}</div>
        </div>
        <div class="activity-actions">
          <button class="activity-btn primary" onclick="navigateToActivity(${index})">🗺️ נווט</button>
          <button class="activity-btn" onclick="viewOnMap(${activity.place.lat}, ${activity.place.lng})">👁️ במפה</button>
          ${activity.place.id ? `<button class="activity-btn" onclick="getPlaceDetails('${activity.place.id}')">ℹ️ פרטים</button>` : ''}
        </div>
      ` : `
        <div class="activity-actions">
          <button class="activity-btn" onclick="searchNearbyForActivity('${activity.name}')">🔍 חפש מקומות</button>
        </div>
      `}
    `;
    activitiesContainer.appendChild(activityEl);
  });

  ui.tripPlanDisplay.appendChild(activitiesContainer);

  // Tips
  if (tripPlan.tips && tripPlan.tips.length > 0) {
    const tipsEl = document.createElement('div');
    tipsEl.className = 'trip-tips';
    tipsEl.innerHTML = `
      <div class="tips-title">💡 טיפים לטיול</div>
      <ul class="tips-list">
        ${tripPlan.tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    `;
    ui.tripPlanDisplay.appendChild(tipsEl);
  }

  // Start navigation button
  const navStart = document.createElement('button');
  navStart.className = 'primary full-width';
  navStart.style.marginTop = '16px';
  navStart.textContent = '🚀 התחל טיול';
  navStart.onclick = () => startLiveNavigation(tripId);
  ui.tripPlanDisplay.appendChild(navStart);
}

function navigateToActivity(activityIndex) {
  currentActivity = activityIndex;
  updateCurrentActivityDisplay();
  
  const activity = currentTrip.activities[activityIndex];
  if (activity.place) {
    viewOnMap(activity.place.lat, activity.place.lng);
    // Auto-calculate route if we have current location
    if (here) {
      calculateRoute(here, { lat: activity.place.lat, lng: activity.place.lng });
    }
  }
}

function viewOnMap(lat, lng) {
  map.setView([lat, lng], 16);
  // Add a temporary marker
  const marker = L.marker([lat, lng]).addTo(map);
  setTimeout(() => map.removeLayer(marker), 5000);
}

/**
 * Add a hazard marker to the map with stable classes for E2E testing
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} hazardData - Hazard information
 * @param {string} hazardData.type - Hazard type (weather, traffic, etc.)
 * @param {string} hazardData.severity - Hazard severity (low, medium, high)
 * @param {string} hazardData.description - Hazard description
 */
function addHazardMarker(lat, lng, hazardData) {
  const { type, severity, description } = hazardData;

  // Create marker with common class
  const marker = L.marker([lat, lng]).addTo(hazardsLayer);

  // Add stable classes to marker element for E2E testing
  const markerElement = marker.getElement();
  if (markerElement) {
    markerElement.classList.add('hazard-marker');
    markerElement.classList.add(`hazard-${type}`);
    markerElement.setAttribute('data-testid', 'hazard-marker');
    markerElement.setAttribute('data-hazard-type', type);
    markerElement.setAttribute('data-severity', severity);
  }

  // Create popup with testable structure
  const popupContent = `
    <div class="hazard-popup" data-testid="hazard-popup">
      <div class="hazard-type" data-testid="hazard-type">${type}</div>
      <div class="hazard-severity ${severity}" data-testid="hazard-severity">${severity}</div>
      <div class="hazard-description" data-testid="hazard-description">${description}</div>
    </div>
  `;

  marker.bindPopup(popupContent);

  return marker;
}

/**
 * Clear all hazard markers from the map
 */
function clearHazards() {
  hazardsLayer.clearLayers();
}

function updateCurrentActivityDisplay() {
  document.querySelectorAll('.trip-activity').forEach((el, index) => {
    el.classList.toggle('current', index === currentActivity);
  });
}

function startLiveNavigation(tripId) {
  ui.liveNavigation.hidden = false;
  ui.liveNavigation.innerHTML = `
    <div class="nav-current">
      <div class="nav-progress">פעילות ${currentActivity + 1} מתוך ${currentTrip.activities.length}</div>
      <div class="nav-destination">${currentTrip.activities[currentActivity].name}</div>
      <div class="nav-instructions">עוקב אחר המיקום ומנווט לפעילות הבאה...</div>
      <div class="nav-actions">
        <button class="nav-btn" onclick="nextActivity('${tripId}')">הבא ✈️</button>
        <button class="nav-btn secondary" onclick="pauseNavigation()">השהה ⏸️</button>
      </div>
    </div>
  `;
  
  // Start location tracking for navigation
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => updateLiveNavigation(tripId, position),
      (error) => console.error('Navigation error:', error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }
}

async function updateLiveNavigation(tripId, position) {
  const currentLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  try {
    const response = await fetch(`${PROXY}/navigate-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        userId: getUserId(),
        currentLocation,
        currentActivity
      })
    });

    const data = await response.json();
    if (data.ok && data.currentActivity) {
      // Update navigation display with real-time info
      const navEl = ui.liveNavigation.querySelector('.nav-current');
      if (navEl) {
        navEl.querySelector('.nav-instructions').textContent = 
          data.navigation ? `${data.navigation.durationText} · ${data.navigation.distanceText}` : 'מחשב מסלול...';
      }
    }
  } catch (error) {
    console.error('Live navigation error:', error);
  }
}

function nextActivity(tripId) {
  if (currentActivity < currentTrip.activities.length - 1) {
    currentActivity++;
    updateCurrentActivityDisplay();
    navigateToActivity(currentActivity);
    
    // Update live navigation
    const navEl = ui.liveNavigation.querySelector('.nav-current');
    if (navEl) {
      navEl.querySelector('.nav-progress').textContent = `פעילות ${currentActivity + 1} מתוך ${currentTrip.activities.length}`;
      navEl.querySelector('.nav-destination').textContent = currentTrip.activities[currentActivity].name;
    }
  } else {
    // Trip completed
    ui.liveNavigation.innerHTML = `
      <div class="nav-current">
        <div class="nav-destination">🎉 הטיול הושלם!</div>
        <div class="nav-instructions">איך היה? דרג את החוויה שלך</div>
        <div class="nav-actions">
          <button class="nav-btn" onclick="rateTripExperience('${tripId}', 5)">מעולה ⭐⭐⭐⭐⭐</button>
          <button class="nav-btn secondary" onclick="rateTripExperience('${tripId}', 3)">בסדר ⭐⭐⭐</button>
        </div>
      </div>
    `;
  }
}

function pauseNavigation() {
  ui.liveNavigation.hidden = true;
}

function rateTripExperience(tripId, rating) {
  trackInteraction('trip_completed', 'trip_rating', { tripId, rating });
  ui.liveNavigation.innerHTML = `
    <div class="nav-current">
      <div class="nav-destination">תודה על הדירוג! 🙏</div>
      <div class="nav-instructions">נשמח לתכנן לך טיולים נוספים</div>
    </div>
  `;
  setTimeout(() => { ui.liveNavigation.hidden = true; }, 3000);
}

// Mobile Navigation System
function initMobileNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const mobileViews = document.querySelectorAll('.mobile-view');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      
      // Update nav active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Update view active state
      mobileViews.forEach(view => view.classList.remove('active'));
      const targetMobileView = document.querySelector(`[data-view="${targetView}"]`);
      if (targetMobileView) {
        targetMobileView.classList.add('active');
      }
      
      // Special handling for map view
      if (targetView === 'map') {
        setTimeout(() => map.invalidateSize(), 300);
      }
      
      // Special handling for trip planning view - load weather data
      if (targetView === 'trip') {
        const center = map.getCenter();
        updateTripPlanningWeather(center.lat, center.lng);
        
        // Initialize trip planning UI interactions
        initTripPlanningInteractions();
      }
      
      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    });
  });
}

// Mobile-specific gestures and interactions
function initMobileGestures() {
  let startX, startY, deltaX, deltaY;
  
  // Add swipe gestures for navigation
  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!startX || !startY) return;
    
    deltaX = e.touches[0].clientX - startX;
    deltaY = e.touches[0].clientY - startY;
  }, { passive: true });
  
  document.addEventListener('touchend', () => {
    if (!startX || !startY) return;
    
    // Reset values
    startX = null;
    startY = null;
    deltaX = 0;
    deltaY = 0;
  }, { passive: true });
}

// Enhanced location services for mobile
function initMobileLocationServices() {
  const locationFab = document.getElementById('locationFab');
  
  if (locationFab) {
    locationFab.addEventListener('click', () => {
      if ('geolocation' in navigator) {
        locationFab.classList.add('loading');
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update map and current location
            map.setView([lat, lng], 15);
            setHere(lat, lng);
            
            // Add haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate([50, 30, 50]);
            }
            
            locationFab.classList.remove('loading');
          },
          (error) => {
            console.error('Location error:', error);
            locationFab.classList.remove('loading');
            
            // Show user-friendly error
            showNotification('לא ניתן לקבל מיקום. אנא בדק הגדרות המיקום.', 'error');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    });
  }
}

// Quick search functionality
function initQuickSearch() {
  const quickSearchInput = document.querySelector('.search-input');
  const quickSearchBtn = document.querySelector('.search-btn');
  
  if (quickSearchInput && quickSearchBtn) {
    quickSearchBtn.addEventListener('click', () => {
      const query = quickSearchInput.value.trim();
      if (query) {
        // Switch to search view and perform search
        document.querySelector('.nav-item[data-view="search"]').click();
        
        // Set the main search input and trigger search
        setTimeout(() => {
          if (ui.freeText) {
            ui.freeText.value = query;
            ui.thinkBtn.click();
          }
        }, 300);
      }
    });
    
    quickSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        quickSearchBtn.click();
      }
    });
  }
}

// Enhanced category cards for mobile
function initMobileCategoryCards() {
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const preset = card.dataset.preset;
      
      // Add visual feedback
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
      
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      
      // Trigger search based on preset
      if (preset) {
        document.getElementById('intent').value = preset;
        ui.searchBtn.click();
      }
    });
  });
}

// Notification system for mobile
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `mobile-notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: calc(var(--mobile-header-height) + 16px);
    left: 16px;
    right: 16px;
    padding: 16px;
    background: var(--glass);
    backdrop-filter: var(--backdrop-blur);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    z-index: 1000;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
    box-shadow: var(--shadow-lg);
  `;
  
  if (type === 'error') {
    notification.style.borderColor = 'var(--secondary)';
    notification.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), var(--glass))';
  } else if (type === 'success') {
    notification.style.borderColor = 'var(--success)';
    notification.style.background = 'linear-gradient(135deg, rgba(107, 207, 127, 0.2), var(--glass))';
  }
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// Profile functionality
function initProfileFeatures() {
  if (ui.refreshInsights) {
    ui.refreshInsights.addEventListener('click', async () => {
      try {
        ui.refreshInsights.disabled = true;
        ui.refreshInsights.textContent = 'מרענן...';
        
        const response = await fetch(`${PROXY}/user-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: getUserId() })
        });
        
        const data = await response.json();
        
        if (data.ok && ui.totalVisits && ui.avgRating) {
          ui.totalVisits.textContent = data.insights.totalVisits || '0';
          ui.avgRating.textContent = data.insights.averageRating || '—';
          
          showNotification('הסטטיסטיקות עודכנו בהצלחה!', 'success');
        }
      } catch (error) {
        showNotification('שגיאה בטעינת הסטטיסטיקות', 'error');
      } finally {
        ui.refreshInsights.disabled = false;
        ui.refreshInsights.textContent = '📊 רענן סטטיסטיקות';
      }
    });
  }
}

// Initialize mobile features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initThemeToggle();
  initAnimations();
  initMobileGestures();
  initMobileLocationServices();
  initQuickSearch();
  initMobileCategoryCards();
  initProfileFeatures();
  initPerformanceMonitoring();
  initEnhancedGestures();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Accessibility improvements
document.addEventListener('keydown', (e)=>{
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); ui.freeText.focus(); }
});

// ✨ ENHANCED UI/UX FEATURES

// Theme Toggle Functionality
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  // Check for saved theme preference or default to 'light'
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (currentTheme === 'light') {
    themeToggle.classList.add('light');
  }
  
  themeToggle.addEventListener('click', () => {
    const isLight = themeToggle.classList.contains('light');
    
    if (isLight) {
      themeToggle.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      themeToggle.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  });
}

// Animation System
function initAnimations() {
  // Intersection Observer for scroll-triggered animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  // Observe all animatable elements
  document.querySelectorAll('.stagger-item, .card, .interactive').forEach(el => {
    observer.observe(el);
  });
  
  // Add ripple effect to buttons
  document.querySelectorAll('.ripple').forEach(button => {
    button.addEventListener('click', createRipple);
  });
  
  // Preload animations for better performance
  document.body.classList.add('animations-ready');
}

// Ripple Effect
function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple-effect');
  
  button.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Enhanced Loading States
function showLoadingState(element, type = 'spinner') {
  const loadingHTML = {
    spinner: '<div class="loading-spinner"></div>',
    skeleton: '<div class="loading-skeleton" style="height: 20px; margin: 8px 0;"></div>'.repeat(3),
    dots: '<div class="loading-dots"></div>'
  };
  
  element.classList.add('loading');
  element.innerHTML = loadingHTML[type];
}

function hideLoadingState(element, content = '') {
  element.classList.remove('loading');
  element.innerHTML = content;
}

// Enhanced Error Handling with Animation
function showError(message, container = document.body) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-state';
  errorElement.textContent = message;
  errorElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    padding: 16px 24px;
    border-radius: 12px;
    max-width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  `;
  
  container.appendChild(errorElement);
  
  setTimeout(() => {
    errorElement.style.animation = 'fadeInUp 0.3s reverse';
    setTimeout(() => errorElement.remove(), 300);
  }, 3000);
}

// Enhanced Success States
function showSuccess(message, container = document.body) {
  const successElement = document.createElement('div');
  successElement.className = 'success-state';
  successElement.textContent = message;
  successElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    padding: 16px 24px;
    border-radius: 12px;
    max-width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  `;
  
  container.appendChild(successElement);
  
  setTimeout(() => {
    successElement.style.animation = 'fadeInUp 0.3s reverse';
    setTimeout(() => successElement.remove(), 300);
  }, 3000);
}

// Performance Monitoring
function initPerformanceMonitoring() {
  // Monitor Core Web Vitals
  if ('web-vital' in window) {
    window.webVitals.getCLS(console.log);
    window.webVitals.getFID(console.log);
    window.webVitals.getLCP(console.log);
  }
  
  // Monitor memory usage
  if ('memory' in performance) {
    const memory = performance.memory;
    console.log('Memory usage:', {
      used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
    });
  }
}

// Enhanced Mobile Gestures
function initEnhancedGestures() {
  let startX, startY, deltaX, deltaY;
  let isScrolling = false;
  
  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isScrolling = false;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!startX || !startY) return;
    
    deltaX = e.touches[0].clientX - startX;
    deltaY = e.touches[0].clientY - startY;
    
    // Determine if user is scrolling
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      isScrolling = true;
    }
    
    // Add pull-to-refresh gesture
    if (deltaY > 100 && !isScrolling && window.scrollY === 0) {
      document.body.classList.add('pull-to-refresh');
    }
  }, { passive: true });
  
  document.addEventListener('touchend', () => {
    document.body.classList.remove('pull-to-refresh');
    
    if (!isScrolling && Math.abs(deltaX) > 50) {
      // Handle swipe gestures
      if (deltaX > 0) {
        // Swipe right
        console.log('Swipe right detected');
      } else {
        // Swipe left  
        console.log('Swipe left detected');
      }
    }
    
    startX = startY = null;
  }, { passive: true });
}
