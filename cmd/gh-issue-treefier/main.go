package main

import (
	"os"

	"github.com/kmtym1998/gh-issue-treefier/internal/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
