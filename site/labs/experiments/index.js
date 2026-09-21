// The experiment catalog. Each entry lazy-loads its module so the home page
// stays light. Entries without `load` are planned but not built yet.

export const catalog = [
  { id: 'catch-ion', number: 1, title: 'Catch an Ion', concept: 'Paul trap stability', mission: 'Hold an ion for 10 s', load: () => import('./catch-ion.js') },
  { id: 'cool-it-down', number: 2, title: 'Cool It Down', concept: 'Doppler laser cooling', mission: 'Reach the cooling limit', load: () => import('./cool-it-down.js') },
  { id: 'bright-or-dark', number: 3, title: 'Bright or Dark', concept: 'Measurement and probability', mission: 'Tell 0 from 1 with 99 % accuracy', load: () => import('./bright-or-dark.js') },
  { id: 'pi-pulse', number: 4, title: 'Find the π-Pulse', concept: 'Rabi oscillation, gate calibration', mission: 'Calibrate an X gate to 98 % fidelity', load: () => import('./pi-pulse.js') },
  { id: 'cancelling-coin', number: 5, title: 'The Cancelling Coin', concept: 'Superposition and interference', mission: 'Predict the double-flip outcome', load: () => import('./cancelling-coin.js') },
  { id: 'entangle', number: 6, title: 'Entangle Two Ions', concept: 'Shared motion, entangling gate, Bell states', mission: 'Make a Bell pair with 90 % fidelity', load: () => import('./entangle.js') },
  { id: 'noise-sandbox', number: 7, title: 'Noise Sandbox', concept: 'Decoherence and spin echo', mission: 'Rescue a qubit from dephasing', load: () => import('./noise-sandbox.js') },
  { id: 'missions', number: 8, title: 'Missions', concept: 'Grover, Deutsch–Jozsa, teleportation', mission: 'Solve each with your calibrated gates', load: () => import('./missions.js') },
];
