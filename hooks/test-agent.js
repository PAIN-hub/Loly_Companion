// Simulation script to test an end-to-end agent workflow with Loly
const SERVER_URL = 'http://127.0.0.1:4141/api/hook';

async function sendHook(payload) {
  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('Error sending hook:', err.message);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDemo() {
  console.log('🚀 Starting Loly Agent Workflow Demonstration...\n');

  console.log('1. Starting Session...');
  await sendHook({
    coucou_agent: 'gemini-cli',
    session_id: 'session-demo-01',
    event_type: 'status',
    title: 'Initializing workspace & analyzing directory',
    details: 'Scanning 24 files in /home/madara/Documents/loly'
  });
  await sleep(2200);

  console.log('2. Reading files...');
  await sendHook({
    coucou_agent: 'gemini-cli',
    session_id: 'session-demo-01',
    event_type: 'command',
    title: 'Reading project architecture',
    details: 'package.json and server.js'
  });
  await sleep(2200);

  console.log('3. Modifying file (with diff preview)...');
  await sendHook({
    coucou_agent: 'gemini-cli',
    session_id: 'session-demo-01',
    event_type: 'file_edit',
    action_type: 'file_edit',
    title: 'Updating server routing & socket bridge',
    target: 'server.js',
    diff: {
      file: 'server.js',
      added: 12,
      removed: 3,
      content: '@@ -120,3 +120,12 @@\n- // Old basic listener\n+ // Enhanced Unix & HTTP Event Dispatcher\n+ const socketServer = net.createServer(handleSocketEvent);\n+ socketServer.listen(SOCKET_PATH);'
    },
    requires_approval: true
  });
  await sleep(4000);

  console.log('4. Requesting Bash Command Execution...');
  await sendHook({
    coucou_agent: 'claude-code',
    session_id: 'session-demo-01',
    event_type: 'approval_request',
    action_type: 'bash_command',
    title: 'Install testing suite',
    target: 'npm test -- --verbose',
    details: 'Runs unit tests for local SQLite and Gemini endpoints',
    requires_approval: true
  });

  console.log('\n✨ Demo events dispatched! Check your Loly island on screen.');
}

runDemo();
