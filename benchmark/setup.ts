import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const projectRoot = join(__dirname, '..');
const projectPackageJson = join(projectRoot, 'package.json');

if (existsSync(projectPackageJson)) {
  let projectName: string | undefined;
  try {
    const pkg: unknown = JSON.parse(readFileSync(projectPackageJson, 'utf8'));
    if (
      typeof pkg === 'object' &&
      pkg !== null &&
      'name' in pkg &&
      typeof (pkg as Record<string, unknown>).name === 'string'
    ) {
      projectName = (pkg as Record<string, string>).name;
    }
  } catch {
    console.log(
      '[benchmark] Failed to read project name from package.json, installing shacl-bridge from npm'
    );
  }

  if (projectName === 'shacl-bridge') {
    console.log('[benchmark] Mode 1: building and linking project...');
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    execSync('npm link', { cwd: projectRoot, stdio: 'inherit' });
    execSync('npm link shacl-bridge', { cwd: __dirname, stdio: 'inherit' });
    console.log('[benchmark] Setup complete.');
    process.exit(0);
  }
}

console.log('[benchmark] Mode 2: using npm-installed shacl-bridge.');
