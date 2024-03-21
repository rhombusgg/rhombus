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
        name = "rhombus";
        pkgs = import nixpkgs {
          inherit system;
          overlays = [(import rust-overlay)];
        };
      in rec {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = name;
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
        };

        apps.default = {
          type = "app";
          program = "${packages.default}/bin/external-plugin";
        };

        devShells.default = pkgs.mkShell {
          name = "${name}-devshell";
          packages = with pkgs;
            [
              tailwindcss-language-server
              vscode-langservers-extracted
              alejandra

              go-task
              tailwindcss
              cargo-watch
              systemfd
              (rust-bin.stable.latest.default.override {
                extensions = ["rust-src"];
                targets = ["x86_64-unknown-linux-musl"];
              })
            ];
        };
      }
    );
}
