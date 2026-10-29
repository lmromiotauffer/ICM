const fs = require("fs");
const path = require("path");

const libPath = path.join(
  "node_modules",
  "@cluster-data-experience",
  "qlik-modules"
);

if (fs.lstatSync(libPath, { throwIfNoEntry: false })?.isSymbolicLink()) {
  console.error("❌ A lib está linkada. Por favor, deslinke-a antes de construir para produção.");
  process.exit(1);
} else {
  console.log("✅ A lib não está linkada.");
}

// ok, segue a vida
process.exit(0);