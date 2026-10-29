// scripts/revert-lib.cjs
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const LIB_NAME = "@cluster-data-experience/qlik-modules";
const libNodeModulesPath = path.join(
  process.cwd(),
  "node_modules",
  ...LIB_NAME.split("/")
);

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) process.exit(res.status || 1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));

const declaredVersion =
  (pkg.dependencies && pkg.dependencies[LIB_NAME]) ||
  (pkg.devDependencies && pkg.devDependencies[LIB_NAME]);

if (!declaredVersion) {
  console.error(`❌ ${LIB_NAME} não está declarado em dependencies nem devDependencies.`);
  process.exit(1);
}

if (!fs.lstatSync(libNodeModulesPath, { throwIfNoEntry: false })?.isSymbolicLink()) {
  console.log("✅ A lib não está linkada. Nada para reverter.");
  process.exit(0);
}

console.log(`🔗 A lib está linkada. Vou reverter para o pacote do registry (${LIB_NAME}@${declaredVersion}).`);

run("npm", ["unlink", LIB_NAME, "--no-save"]);
run("npm", ["install", `${LIB_NAME}@${declaredVersion}`]);

console.log(`✅ Lib revertida para ${LIB_NAME}@${declaredVersion} a partir do registry.`);

// must exit successfully
process.exit(0);