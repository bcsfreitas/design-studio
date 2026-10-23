// Identity inspection and scoped assignment run without loading the runtime manifest.
const command = process.argv[2];
if (['identity-audit', 'identify'].includes(command)) await import('./studio-identity.js');
// Updating must work whatever state the studio's settings are in, so it does not load the runtime.
else if (command === 'update') await import('./studio-update.js');
else if (command === 'preferences') await import('./studio-preferences.js');
// Your own profile: name, emails, GitHub account. It reads contributors only, not the runtime manifest.
else if (command === 'profile') await import('./studio-profile.js');
// Deletes one prototype after a preview of what would break; it refreshes the manifest itself.
else if (command === 'delete-prototype') await import('./studio-delete-prototype.js');
// The recorded dev server: status, restart on the same port, stop. It reads the registry only.
else if (command === 'dev') await import('./studio-dev.js');
else await import('./studio-runtime.js');
