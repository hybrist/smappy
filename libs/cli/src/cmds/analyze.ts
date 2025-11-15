// TODO: Turn this into a sub command for the CLI in src/main.ts.
//
// Example usage:
//
//   smappy analyze # Analyze the project in the current directory.
//
//   smappy analyze path/to/project # Analyze given directory.
//
// The command should generally detect options and flags, e.g.:
//
// * The bundler used (based on config files & package.json deps)
// * The framework used (based on package.json deps)
//
// There should be no configuration files required in the project,
// e.g. if necessary, the command should generate temporary configs
// in tmpdir to avoid polluting the project directory. This can be
// used to inject plugins to extend the configs of the project.
//
// Implementing this might involve adding persistence support to
// @smappy/core (or a new package like @smappy/store). By default,
// let's store the database in the home directory of the user.
//
// The core implementation of the analysis command should be decoupled
// from the CLI interface so we can also offer the command as an MCP
// tool in the future.
