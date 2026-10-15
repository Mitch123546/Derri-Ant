const STORAGE_KEY = "derri-ant-demo-v1";

const defaultState = {
  selectedId: "front",
  devices: [
    { id: "front", name: "Front Perimeter", location: "Driveway + entry", tank: 78, online: true, status: "ready", last: "Today, 6:42 AM" },
    { id: "back", name: "Back Garden", location: "Patio + garden", tank: 54, online: true, status: "ready", last: "Yesterday, 7:10 PM" },
    { id: "side", name: "Side Yard", location: "East fence line", tank: 31, online: true, status: "ready", last: "Oct 14, 6:30 AM" }
  ],
  schedules: [
    { id: 1, deviceId: "front", date: "2026-10-18", time: "06:30", duration: 20, repeat: "Weekly" },
    { id: 2, deviceId: "front", date: "2026-10-23", time: "18:45", duration: 10, repeat: "Once" },
    { id: 3, deviceId: "back", date: "2026-10-20", time: "07:00", duration: 15, repeat: "Biweekly" }
  ]
};

let state = loadState();
let sprayTimer = null;
let sprayRemaining = 0;
let sprayDeviceId = null;

const $ = (selector) => document.querySelector(selector);
const els = {
  deviceList: $("#deviceList"), selectedName: $("#selectedName"), selectedConnection: $("#selectedConnection"),
  statusText: $("#statusText"), statusSubtext: $("#statusSubtext"), statusIcon: $("#statusIcon"), statusOrb: $("#statusOrb"),
  liveBadge: $("#liveBadge"), lastActivity: $("#lastActivity"), tankGauge: $("#tankGauge"), tankPercent: $("#tankPercent"),
  tankMinutes: $("#tankMinutes"), tankLabel: $("#tankLabel"), nextDay: $("#nextDay"), nextMonth: $("#nextMonth"),
  nextTime: $("#nextTime"), nextDuration: $("#nextDuration"), scheduleList: $("#scheduleList"), scheduleCount: $("#scheduleCount"),
  durationInput: $("#durationInput"), durationValue: $("#durationValue"), estimatePill: $("#estimatePill"),
  scheduleDate: $("#scheduleDate"), scheduleTime: $("#scheduleTime"), repeatSelect: $("#repeatSelect"), scheduleForm: $("#scheduleForm"),
  runNowBtn: $("#runNowBtn"), refillBtn: $("#refillBtn"), toast: $("#toast"), toastText: $("#toastText"),
  addDeviceBtn: $("#addDeviceBtn"), deviceDialog: $("#deviceDialog"), deviceForm: $("#deviceForm"), newDeviceName: $("#newDeviceName")
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.devices?.length ? stored : structuredClone(defaultState);
  } catch { return structuredClone(defaultState); }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function selectedDevice() { return state.devices.find(d => d.id === state.selectedId) || state.devices[0]; }
function deviceSchedules() { return state.schedules.filter(s => s.deviceId === state.selectedId).sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)); }
function usageFor(minutes) { return minutes * .5; }
function esc(value) { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; }

function render() {
  const device = selectedDevice();
  els.deviceList.innerHTML = state.devices.map(d => `
    <button class="device-item ${d.id === state.selectedId ? "active" : ""}" data-device="${d.id}">
      <span class="device-icon">${d.status === "spraying" ? "≈" : "⌂"}</span>
      <span><strong>${esc(d.name)}</strong><small>${esc(d.location)}</small></span>
      <span class="device-tank">${Math.round(d.tank)}%</span>
    </button>`).join("");

  els.selectedName.textContent = device.name;
  els.selectedConnection.textContent = device.online ? "Online · Signal strong" : "Offline";
  els.lastActivity.textContent = device.last;
  els.tankPercent.textContent = `${Math.round(device.tank)}%`;
  els.tankGauge.querySelector(".tank-liquid").style.height = `${device.tank}%`;
  els.tankMinutes.textContent = Math.floor(device.tank / .5);
  els.tankLabel.textContent = device.tank > 50 ? "Healthy level" : device.tank > 20 ? "Plan a refill" : "Refill needed";

  const spraying = device.status === "spraying";
  $(".status-card").classList.toggle("spraying", spraying);
  els.statusText.textContent = spraying ? "Spraying" : "Ready";
  els.statusSubtext.textContent = spraying ? `${sprayRemaining} simulated min remaining` : "System is standing by";
  els.statusIcon.textContent = spraying ? "≈" : "✓";
  els.liveBadge.textContent = spraying ? "ACTIVE" : "LIVE";
  els.runNowBtn.innerHTML = spraying ? '<span class="play">■</span> Stop test' : '<span class="play">▶</span> Run 10-min test';

  renderSchedules();
  renderNextTreatment();
}

function renderSchedules() {
  const schedules = deviceSchedules();
  els.scheduleCount.textContent = `${schedules.length} scheduled`;
  if (!schedules.length) {
    els.scheduleList.innerHTML = '<div class="empty-state"><p><span>◷</span><strong>No treatments yet</strong>Use the form to add this zone’s first schedule.</p></div>';
    return;
  }
  els.scheduleList.innerHTML = schedules.map(s => {
    const date = parseLocalDate(s.date);
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const time = formatTime(s.time);
    return `<div class="schedule-row">
      <div class="schedule-date">${date.getDate()}<small>${month}</small></div>
      <div><strong>${time} · ${s.duration} minutes</strong><p>${esc(s.repeat)} · Est. ${formatUsage(usageFor(s.duration))}% tank</p></div>
      <div class="schedule-actions"><button class="tiny-button" data-delete="${s.id}" aria-label="Delete schedule">×</button></div>
    </div>`;
  }).join("");
}

function renderNextTreatment() {
  const next = deviceSchedules()[0];
  if (!next) {
    els.nextDay.textContent = "—"; els.nextMonth.textContent = "NONE"; els.nextTime.textContent = "Not scheduled"; els.nextDuration.textContent = "Add a treatment below"; return;
  }
  const date = parseLocalDate(next.date);
  els.nextDay.textContent = date.getDate();
  els.nextMonth.textContent = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  els.nextTime.textContent = formatTime(next.time);
  els.nextDuration.textContent = `${selectedDevice().name} · ${next.duration} minutes`;
}

function parseLocalDate(value) { const [y,m,d] = value.split("-").map(Number); return new Date(y,m-1,d); }
function formatTime(value) { const [h,m] = value.split(":").map(Number); return new Date(2000,0,1,h,m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function formatUsage(value) { return Number.isInteger(value) ? value : value.toFixed(1); }
function showToast(message) { els.toastText.textContent = message; els.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2800); }

els.deviceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-device]");
  if (!button) return;
  state.selectedId = button.dataset.device;
  saveState(); render();
});

els.durationInput.addEventListener("input", () => {
  const duration = Number(els.durationInput.value);
  els.durationValue.textContent = `${duration} min`;
  els.estimatePill.textContent = `Est. ${formatUsage(usageFor(duration))}% tank`;
});

els.scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const duration = Number(els.durationInput.value);
  const device = selectedDevice();
  if (usageFor(duration) > device.tank) { showToast("Not enough tank for this treatment"); return; }
  state.schedules.push({ id: Date.now(), deviceId: state.selectedId, date: els.scheduleDate.value, time: els.scheduleTime.value, duration, repeat: els.repeatSelect.value });
  saveState(); render(); showToast(`Treatment added for ${device.name}`);
});

els.scheduleList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  state.schedules = state.schedules.filter(s => String(s.id) !== button.dataset.delete);
  saveState(); render(); showToast("Treatment removed");
});

els.runNowBtn.addEventListener("click", () => {
  const device = selectedDevice();
  if (device.status === "spraying") { stopSpray(false); return; }
  if (device.tank < 5) { showToast("Refill the tank before running a test"); return; }
  device.status = "spraying";
  sprayDeviceId = device.id;
  sprayRemaining = 10;
  saveState(); render(); showToast("10-minute simulation started · 1 sec = 1 min");
  sprayTimer = setInterval(() => {
    sprayRemaining -= 1;
    if (sprayRemaining <= 0) stopSpray(true); else render();
  }, 1000);
});

function stopSpray(completed) {
  clearInterval(sprayTimer); sprayTimer = null;
  const device = state.devices.find(item => item.id === sprayDeviceId) || selectedDevice();
  const elapsed = 10 - sprayRemaining;
  device.tank = Math.max(0, device.tank - usageFor(elapsed));
  device.status = "ready";
  device.last = "Just now";
  sprayRemaining = 0;
  sprayDeviceId = null;
  saveState(); render();
  showToast(completed ? "Test complete · 5% tank used" : `Test stopped · ${formatUsage(usageFor(elapsed))}% tank used`);
}

els.refillBtn.addEventListener("click", () => { const device = selectedDevice(); device.tank = 100; saveState(); render(); showToast(`${device.name} refilled to 100%`); });
els.addDeviceBtn.addEventListener("click", () => { els.newDeviceName.value = ""; els.deviceDialog.showModal(); setTimeout(() => els.newDeviceName.focus(), 50); });
els.deviceForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const name = els.newDeviceName.value.trim(); if (!name) return;
  const id = `device-${Date.now()}`;
  state.devices.push({ id, name, location: "New test zone", tank: 100, online: true, status: "ready", last: "No activity yet" });
  state.selectedId = id; saveState(); els.deviceDialog.close(); render(); showToast(`${name} added`);
});
$("#tankInfo").addEventListener("click", () => showToast("Usage model: 0.5% tank per spray minute"));

const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
els.scheduleDate.min = new Date().toISOString().slice(0,10);
els.scheduleDate.value = tomorrow.toISOString().slice(0,10);
render();

