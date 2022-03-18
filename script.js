function parseDate(seconds) {
  const hours = Math.floor(seconds / 60 / 60);
  seconds -= hours * 60 * 60;

  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  const d = new Date();
  d.setHours(hours, minutes, seconds);
  
  return d;
}

function getDiffMinutes(from, to) {
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (60 * 1000));
}

function formatTime(time) {
  return `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
}

async function loadTimetable(stops) {
  const url = `https://transport.tallinn.ee/siri-stop-departures.php?stopid=${stops.join(',')}`;
  
  // const response = await fetch(url);
  // const data = await response.text();
  const data = await loadUrl(url);

  const busRegex = /\w+,([\d\w]+),(\d+),(\d+)/g;
  const stopRegex = /stop,(\d+)\n([\w\p{L}\p{M}\s\.,-]+?)(?=stop|$)/g;

  const timetable = {};
  const now = new Date();

  let stopMatch;
  while ((stopMatch = stopRegex.exec(data)) !== null) {
    const [, stopId, stopBuses] = stopMatch;

    timetable[stopId] = [];

    let busMatch;
    while ((busMatch = busRegex.exec(stopBuses)) !== null) {
      const [, route, expectedTimeSeconds, scheduleTimeSeconds] = busMatch;

      const expected = parseDate(expectedTimeSeconds);
      const schedule = parseDate(scheduleTimeSeconds);

      const delay = getDiffMinutes(schedule, expected);
      const wait = getDiffMinutes(now, expected);
      if (wait > 20) {
        continue;
      }

      timetable[stopId].push({
        route,
        expected,
        schedule,
        wait,
        delay
      });
    }
  }

  return timetable;
}

async function loadUrl(url) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      xhr.status === 200
        ? resolve(xhr.responseText)
        : reject(xhr.statusText)
    };
    xhr.onerror = () => {
      reject();
    };
    xhr.send();
  });  
}

function render(stop) {
  return stop
    .map(bus => `
      <span class="route">${bus.route}</span>
      <span class="waiting-time">${bus.wait > 0 ? `${bus.wait} min.` : 'now&nbsp;'}</span>
      <span class="wall-time">(${formatTime(bus.expected)})</span>
      <span class="${bus.delay !== 0 ? "delay" : "delay zero"}">
        ${bus.delay > 0 ? `+${bus.delay}` : `${bus.delay}`}
      </span>`)
    .join('\n');
}

(async () => {
  try {
    const stops = [67, 68, 930];
    const timetable = await loadTimetable(stops);

    stops.forEach(stop => {
      document.querySelector(`.stop-${stop}>.timetable`).innerHTML = render(timetable[stop]);
    });

  } catch (e) {
    console.error(e);
  }
})();
