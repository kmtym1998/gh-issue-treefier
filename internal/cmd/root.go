package cmd

import "github.com/spf13/cobra"

func newRootCmd() *cobra.Command {
	rootCmd := &cobra.Command{
		Use:   "gh issue-treefier",
		Short: "GitHub Issue Treefier",
	}

	rootCmd.AddCommand(newConsoleCmd())

	return rootCmd
}

func Execute() error {
	return newRootCmd().Execute()
}
