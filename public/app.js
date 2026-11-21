(() => {
  const $ = id => document.getElementById(id);
  const storageKey = 'gaon-studio-draft-v1';
  const formIds = ['title', 'language', 'script', 'notes', 'planner', 'model', 'story', 'voice-engine', 'voice-model', 'narrator', 'fps', 'resolution'];
  const tabs = ['script', 'story', 'library'];
  const ready = { setup: {}, models: {}, timeline: null, film: null, at: 0, playing: false, frame: 0, shot: -1, preview: 0, source: '', job: null };
  const ratio = () => document.querySelector('input[name="ratio"]:checked').value;
  const source = () => JSON.stringify([$('script').value, $('notes').value, $('language').value]);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function elem(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function message(id, value = '', error = false) {
    const node = $(id);
    node.textContent = value;
    node.hidden = !value;
    node.classList.toggle('error', error);
  }

  async function api(url, data) {
    const options = data === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    };
    const reply = await fetch(url, options);
    const value = await reply.json();
    if (!reply.ok) throw new Error(value.error || `Studio request failed (HTTP ${reply.status}).`);
    return value;
  }

  function persist() {
    const values = Object.fromEntries(formIds.map(id => [id, $(id).value]));
    Object.assign(values, { ratio: ratio(), captions: $('captions').checked, source: ready.source, models: ready.models, job: ready.job });
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // Export and JSON downloads still work when browser storage is full.
    }
  }

  function setRatio(value) {
    for (const input of document.querySelectorAll('input[name="ratio"]')) input.checked = input.value === value;
  }

  function useMetadata(story) {
    $('title').value = story.title || 'Untitled village story';
    setRatio(story.ratio === '9:16' ? '9:16' : '16:9');
    if (!Array.from($('language').options).some(item => item.value === story.language) && /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(story.language || '')) {
      $('language').add(new Option(story.language, story.language));
    }
    $('language').value = story.language || 'hi';
    $('captions').checked = story.captions !== false;
  }

  function readDraft() {
    try {
      const state = JSON.parse(localStorage.getItem(storageKey));
      if (!state?.story && !state?.script) return false;
      for (const id of formIds) if (typeof state[id] === 'string') $(id).value = state[id];
      if (!$('language').value) {
        $('language').add(new Option(state.language, state.language));
        $('language').value = state.language;
      }
      setRatio(state.ratio === '9:16' ? '9:16' : '16:9');
      $('captions').checked = state.captions !== false;
      ready.source = typeof state.source === 'string' ? state.source : '';
      ready.models = state.models || {};
      ready.job = state.job || null;
      return true;
    } catch {
      return false;
    }
  }

  function draftStory(requireFresh = false) {
    if (!$('story').value.trim()) throw new Error('Build or import a storyboard first.');
    if (requireFresh && ready.source && ready.source !== source()) {
      throw new Error('Your script or notes changed. Build the storyboard again before export.');
    }
    let story;
    try {
      story = JSON.parse($('story').value);
    } catch {
      throw new Error('Fix the JSON syntax in the Storyboard tab.');
    }
    if (!story || typeof story !== 'object' || Array.isArray(story)) throw new Error('The storyboard must be a JSON object.');
    return { ...story, title: $('title').value, ratio: ratio(), language: $('language').value, captions: $('captions').checked };
  }

  function tab(name) {
    for (const id of tabs) {
      $(id + '-tab').setAttribute('aria-selected', String(id === name));
      $(id + '-tab').tabIndex = id === name ? 0 : -1;
      $(id + '-pane').hidden = id !== name;
    }
    if (name === 'library') refreshLibrary().catch(error => message('editor-status', error.message, true));
  }

  function displayTime(seconds) {
    const value = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  }

  function draw(at) {
    if (!ready.film) return;
    ready.at = Math.min(Math.max(0, at), ready.timeline.duration);
    const index = ready.film.drawAt(ready.at);
    if (index !== ready.shot) {
      $('shots').children[ready.shot]?.classList.remove('active');
      $('shots').children[index]?.classList.add('active');
      ready.shot = index;
    }
    $('seek').value = ready.at;
    $('clock').textContent = `${displayTime(ready.at)} / ${displayTime(ready.timeline.duration)}`;
  }

  function stop() {
    ready.playing = false;
    cancelAnimationFrame(ready.frame);
    $('play').textContent = '▶';
    $('play').title = 'Play preview';
    $('play').setAttribute('aria-label', 'Play preview');
  }

  function togglePlay() {
    if (!ready.timeline || !$('video').hidden) return;
    if (ready.playing) return stop();
    if (ready.at >= ready.timeline.duration - 0.01) draw(0);
    const start = performance.now() - ready.at * 1000;
    ready.playing = true;
    $('play').textContent = '❚❚';
    $('play').title = 'Pause preview';
    $('play').setAttribute('aria-label', 'Pause preview');
    const tick = now => {
      draw((now - start) / 1000);
      if (ready.at >= ready.timeline.duration) stop();
      else ready.frame = requestAnimationFrame(tick);
    };
    ready.frame = requestAnimationFrame(tick);
  }

  function monitor(title, frame, rendered) {
    $('monitor-title').textContent = title;
    $('monitor-ratio').textContent = frame;
    $('screen').dataset.ratio = frame;
    $('screen-label').textContent = rendered ? 'RENDERED FILM' : 'STORYBOARD · SILENT';
    $('video').hidden = !rendered;
    $('canvas').hidden = rendered;
    $('transport').hidden = rendered;
    $('back-preview').hidden = !rendered;
    if (!rendered) $('video').pause();
  }

  function showPreview() {
    if (!ready.timeline) return;
    monitor(ready.timeline.title, ready.timeline.ratio, false);
  }

  function drawStrip(timeline) {
    $('shots').replaceChildren();
    $('shot-count').textContent = `${timeline.shots.length} ${timeline.shots.length === 1 ? 'SHOT' : 'SHOTS'}`;
    for (const [index, shot] of timeline.shots.entries()) {
      const button = elem('button', 'shot');
      button.type = 'button';
      button.title = shot.direction || shot.name;
      button.append(elem('small', '', `${String(index + 1).padStart(2, '0')} · ${shot.camera.frame}`), elem('strong', '', shot.name), elem('small', '', `${shot.time} · ${shot.duration.toFixed(1)} s`));
      button.addEventListener('click', () => {
        stop();
        showPreview();
        draw(shot.start + Math.min(0.42, shot.duration / 3));
      });
      $('shots').append(button);
    }
  }

  async function preview() {
    const request = ++ready.preview;
    const timeline = await api('/api/preview', { story: draftStory() });
    const images = await VillageCanvas.loadImages(timeline);
    if (request !== ready.preview) return;
    stop();
    $('canvas').width = timeline.ratio === '9:16' ? 720 : 1280;
    $('canvas').height = timeline.ratio === '9:16' ? 1280 : 720;
    ready.timeline = timeline;
    ready.film = VillageCanvas.create($('canvas'), timeline, images);
    ready.shot = -1;
    const selected = $('paint-scene').value;
    $('paint-scene').replaceChildren(...timeline.scenes.map(scene => new Option(scene.name, scene.name)));
    if (timeline.scenes.some(scene => scene.name === selected)) $('paint-scene').value = selected;
    showPreview();
    drawStrip(timeline);
    $('seek').max = timeline.duration;
    draw(Math.min(1.25, timeline.shots[0].duration * 0.5));
  }

  function plannerHelp() {
    const kind = $('planner').value;
    $('model').disabled = kind === 'offline';
    $('model').placeholder = ready.setup.models?.[kind] || 'Provider model ID';
    const hints = {
      offline: 'Uses shot headings and bracketed directions. You can refine the result in Storyboard.',
      ollama: 'Uses an installed model on your PC. Start Ollama before building a storyboard.',
      openai: ready.setup.openaiConfigured ? 'Sends the script and shot notes to OpenAI.' : 'Set OPENAI_API_KEY in .env and restart. This planner sends the script and shot notes to OpenAI.',
      anthropic: ready.setup.anthropicConfigured ? 'Sends the script and shot notes to Anthropic.' : 'Set ANTHROPIC_API_KEY in .env and restart. This planner sends the script and shot notes to Anthropic.',
    };
    $('planner-hint').textContent = hints[kind];
  }

  async function loadExample(language = 'en') {
    const { story, script } = await api('/api/demo?language=' + language);
    useMetadata(story);
    $('script').value = script;
    $('notes').value = '';
    $('story').value = JSON.stringify(story, null, 2);
    $('voice-engine').value = 'auto';
    ready.source = source();
    tab('script');
    persist();
    await preview();
  }

  async function build() {
    message('editor-status', 'Building the storyboard…');
    const submittedSource = source();
    const story = await api('/api/plan', {
      title: $('title').value, ratio: ratio(), language: $('language').value, script: $('script').value, notes: $('notes').value,
      planner: $('planner').value, model: $('model').value,
    });
    ready.source = submittedSource;
    $('story').value = JSON.stringify(story, null, 2);
    persist();
    await preview();
    tab('story');
    const detail = story.warnings.filter(warning => !warning.startsWith('Created '));
    message('editor-status', [`${story.shots.length} ${story.shots.length === 1 ? 'shot' : 'shots'} ready to preview.`, ...detail].join('\n'));
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      message('editor-status', `Copied ${value}`);
    } catch {
      message('editor-status', value);
    }
  }

  function libraryItem(title, detail, action, value) {
    const row = elem('div', 'asset');
    const label = elem('span', '', title);
    label.append(elem('small', '', detail));
    const button = elem('button', 'text-button', action);
    button.type = 'button';
    button.addEventListener('click', () => copy(value));
    row.append(label, button);
    return row;
  }

  async function refreshLibrary() {
    const library = await api('/api/library');
    $('asset-list').replaceChildren();
    for (const kind of ['characters', 'scenes', 'props']) {
      const group = elem('details', 'asset-group');
      group.open = true;
      group.append(elem('summary', '', `${kind[0].toUpperCase()}${kind.slice(1)} · ${library[kind].length}`));
      for (const asset of library[kind]) {
        group.append(libraryItem(asset.name, asset.costume || asset.kind, 'Copy name', asset.name));
      }
      if (!library[kind].length) group.append(elem('p', 'hint', 'Save or render a storyboard to add assets.'));
      $('asset-list').append(group);
    }
    $('media-list').replaceChildren(...library.media.map(file => libraryItem(file.name, file.id, 'Copy ID', file.id)));
    if (!library.media.length) $('media-list').append(elem('p', 'hint', 'No imported files yet.'));
  }

  function showRender(job) {
    stop();
    const base = '/renders/' + job.id + '/';
    const video = $('video');
    video.src = base + 'video.mp4';
    video.poster = base + 'poster.jpg';
    monitor(job.title, job.ratio, true);
    const links = [['Download MP4', 'video.mp4'], ['Download SRT', 'captions.srt'], ['Storyboard JSON', 'storyboard.json']].map(([title, file]) => {
      const link = elem('a', 'secondary compact', title);
      link.href = base + file + '?download=1';
      return link;
    });
    $('downloads').replaceChildren(...links);
    $('downloads').hidden = false;
    const notes = (job.warnings || []).filter(warning => !warning.startsWith('Created '));
    message('export-status', notes.join('\n'));
  }

  async function refreshHistory() {
    const history = await api('/api/history');
    $('history').replaceChildren();
    const completed = history.filter(job => job.status === 'done');
    if (!completed.length) $('history').append(elem('p', 'hint', 'Rendered films appear here.'));
    for (const job of completed) {
      const row = elem('div', 'history-entry');
      const title = elem('span', '', job.title);
      title.append(elem('small', '', `${job.ratio} · ${job.duration.toFixed(1)} s`));
      const button = elem('button', 'text-button', 'Open film');
      button.type = 'button';
      button.addEventListener('click', () => showRender(job));
      row.append(title, button);
      $('history').append(row);
    }
  }

  async function poll(id) {
    $('export').disabled = true;
    $('progress-wrap').hidden = false;
    try {
      while (true) {
        const job = await api('/api/jobs/' + id);
        $('export-stage').textContent = job.stage;
        $('percent').textContent = `${job.percent}%`;
        $('progress').value = job.percent;
        if (job.status === 'error') throw new Error(job.error || job.stage);
        if (job.status === 'done') {
          showRender(job);
          break;
        }
        await wait(750);
      }
    } finally {
      ready.job = null;
      persist();
      $('export').disabled = false;
      $('progress-wrap').hidden = true;
      refreshHistory().catch(() => {});
    }
  }

  async function exportFilm() {
    message('export-status');
    const story = draftStory(true);
    const { id } = await api('/api/render', {
      story, settings: {
        voiceEngine: $('voice-engine').value, voiceModel: $('voice-model').value,
        narratorVoice: $('narrator').value, fps: Number($('fps').value), resolution: Number($('resolution').value),
      },
    });
    ready.job = id;
    persist();
    await poll(id);
  }

  function bind(button, action, region = 'editor-status') {
    $(button).addEventListener('click', async () => {
      $(button).disabled = true;
      try {
        await action();
      } catch (error) {
        message(region, error.message, true);
      } finally {
        $(button).disabled = false;
      }
    });
  }

  for (const name of tabs) {
    const button = $(name + '-tab');
    button.addEventListener('click', () => tab(name));
    button.addEventListener('keydown', event => {
      const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!offset) return;
      event.preventDefault();
      const next = tabs[(tabs.indexOf(name) + offset + tabs.length) % tabs.length];
      tab(next);
      $(next + '-tab').focus();
    });
  }
  for (const id of formIds) $(id).addEventListener('input', persist);
  $('model').addEventListener('input', () => { ready.models[$('planner').value] = $('model').value; persist(); });
  $('planner').addEventListener('change', () => { $('model').value = ready.models[$('planner').value] || ''; plannerHelp(); persist(); });
  for (const control of [...document.querySelectorAll('input[name="ratio"]'), $('captions'), $('title')]) {
    control.addEventListener('change', () => {
      persist();
      if ($('story').value.trim()) preview().catch(error => message('editor-status', error.message, true));
    });
  }
  $('play').addEventListener('click', togglePlay);
  $('seek').addEventListener('input', () => { stop(); draw(Number($('seek').value)); });
  $('back-preview').addEventListener('click', showPreview);

  bind('load-demo', async () => { await loadExample(); message('editor-status'); });
  bind('load-hindi', async () => { await loadExample('hi'); message('editor-status'); });
  bind('plan', build);
  bind('update-preview', async () => { await preview(); message('editor-status', 'Preview updated.'); });
  bind('save-assets', async () => {
    await api('/api/library', { story: draftStory(true) });
    message('editor-status', 'Storyboard assets saved to the shared library.');
  });
  bind('paint', async () => {
    const draft = $('story').value;
    message('editor-status', 'Painting the location…');
    const { scene, image } = await api('/api/paint', { story: draftStory(true), scene: $('paint-scene').value });
    if (draft !== $('story').value) {
      message('editor-status', `Backdrop saved to Media. Set the image of ${scene} to ${image.id}.`);
      return;
    }
    const story = draftStory(true);
    story.scenes ||= [];
    let definition = story.scenes.find(asset => VillageDraw.key(asset.name) === VillageDraw.key(scene));
    if (!definition) {
      definition = { name: scene };
      story.scenes.push(definition);
    }
    definition.image = image.id;
    $('story').value = JSON.stringify(story, null, 2);
    persist();
    await preview();
    message('editor-status', `Backdrop added to ${scene}. Save it to the library to reuse it in another film.`);
  });
  bind('download-story', async () => {
    const data = new Blob([JSON.stringify(draftStory(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const link = elem('a');
    link.href = url;
    link.download = 'storyboard.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  });
  bind('export', exportFilm, 'export-status');
  bind('refresh-voices', async () => {
    const profiles = await api('/api/voices');
    $('voices').replaceChildren(...profiles.map(profile => new Option(profile.name, profile.id)));
    $('voice-status').textContent = profiles.length
      ? profiles.map(profile => `${profile.name} [${profile.id}]`).join(' · ')
      : 'VoiceStudio is online. Use the default voice or create a profile in VoiceStudio.';
  }, 'export-status');

  $('import-story').addEventListener('click', () => $('story-file').click());
  $('story-file').addEventListener('change', async () => {
    try {
      const file = $('story-file').files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) throw new Error('Storyboard JSON must be smaller than 3 MB.');
      const story = JSON.parse(await file.text());
      await api('/api/preview', { story });
      useMetadata(story);
      $('story').value = JSON.stringify(story, null, 2);
      ready.source = source();
      persist();
      await preview();
      message('editor-status', 'Storyboard loaded.');
    } catch (error) {
      message('editor-status', error.message, true);
    } finally {
      $('story-file').value = '';
    }
  });
  $('import-media').addEventListener('click', () => $('media-file').click());
  $('media-file').addEventListener('change', async () => {
    try {
      const file = $('media-file').files[0];
      if (!file) return;
      if (file.size > 30 * 1024 * 1024) throw new Error('Media files must be smaller than 30 MB.');
      const response = await fetch('/api/media?name=' + encodeURIComponent(file.name), { method: 'POST', body: file });
      const item = await response.json();
      if (!response.ok) throw new Error(item.error);
      await refreshLibrary();
      message('editor-status', `Imported ${item.name}. Media ID ${item.id}`);
    } catch (error) {
      message('editor-status', error.message, true);
    } finally {
      $('media-file').value = '';
    }
  });

  async function init() {
    ready.setup = await api('/api/setup');
    const restored = readDraft();
    $('voice-model').placeholder = ready.setup.voiceModel;
    $('paint-settings').hidden = !ready.setup.paintingConfigured;
    plannerHelp();
    tab('script');
    if (restored) {
      if ($('story').value.trim()) await preview().catch(error => message('editor-status', error.message, true));
    } else await loadExample();
    await refreshHistory();
    if (ready.job) await poll(ready.job).catch(error => message('export-status', error.message, true));
  }
  init().catch(error => message('editor-status', error.message, true));
})();
