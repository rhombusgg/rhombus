{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = {
    nixpkgs,
    utils,
    rust-overlay,
    ...
  }:
    utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [(import rust-overlay)];
        };

        rust-toolchain = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
      in rec {
        packages.rhombus-cli = pkgs.rustPlatform.buildRustPackage {
          pname = "rhombus-cli";
          buildAndTestSubdir = "rhombus-cli";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
        };

        packages.standalone = pkgs.rustPlatform.buildRustPackage {
          pname = "standalone";
          buildAndTestSubdir = "examples/standalone";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
        };

        apps.rhombus-cli = {
          type = "app";
          program = "${packages.rhombus-cli}/bin/rhombus-cli";
        };

        apps.standalone = {
          type = "app";
          program = "${packages.standalone}/bin/standalone";
        };

        packages.default = packages.rhombus-cli;
        app.default = apps.rhombus-cli;

        devShells.default = pkgs.mkShell {
          name = "rhombus-devshell";
          packages = with pkgs; [
            tailwindcss-language-server
            vscode-langservers-extracted
            alejandra

            nodejs_20
            sqlite
            mold
            go-task
            tailwindcss
            cargo-watch
            systemfd
            rust-toolchain
            deno
            nodePackages.pnpm
          ];
          LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
        };
      }
    );
}
