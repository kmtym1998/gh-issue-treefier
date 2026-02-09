package cmd

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"os/exec"
	"runtime"

	"github.com/cli/go-gh/v2/pkg/api"
	"github.com/cli/go-gh/v2/pkg/prompter"
	"github.com/cli/go-gh/v2/pkg/repository"
	"github.com/cli/go-gh/v2/pkg/term"
	"github.com/kmtym1998/gh-issue-treefier/internal/github"
	"github.com/kmtym1998/gh-issue-treefier/internal/server"
	"github.com/samber/lo"
	"github.com/spf13/cobra"
)

func newConsoleCmd() *cobra.Command {
	var port int

	cmd := &cobra.Command{
		Use:   "console",
		Short: "Start the web console",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runConsole(port)
		},
	}

	cmd.Flags().IntVar(&port, "port", 0, "Port to listen on (0 for auto)")

	return cmd
}

func runConsole(port int) error {
	if port == 0 {
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			return fmt.Errorf("failed to find available port: %w", err)
		}
		port = listener.Addr().(*net.TCPAddr).Port
		listener.Close()
	}

	srv := server.New(port)

	openURL, err := buildURL(port)
	if err != nil {
		return err
	}
	fmt.Printf("Starting server on http://localhost:%d\n", port)

	if err := openBrowser(openURL); err != nil {
		fmt.Fprintf(os.Stderr, "warning: failed to open browser: %v\n", err)
	}

	return srv.Start()
}

func buildURL(port int) (string, error) {
	u := fmt.Sprintf("http://localhost:%d", port)
	repo, err := repository.Current()
	if err != nil {
		return u, err
	}
	q := url.Values{}
	q.Set("owner", repo.Owner)

	term := term.FromEnv()
	in, ok := term.In().(*os.File)
	if !ok {
		return "", errors.New("failed to initialize prompter")
	}
	out, ok := term.Out().(*os.File)
	if !ok {
		return "", errors.New("failed to initialize prompter")
	}
	errOut, ok := term.ErrOut().(*os.File)
	if !ok {
		return "", errors.New("failed to initialize prompter")
	}

	gqlClient, err := api.DefaultGraphQLClient()
	if err != nil {
		return "", fmt.Errorf("failed to create GraphQL client: %w", err)
	}
	gw := github.NewProjectGateway(gqlClient)
	projects, err := gw.ListOrgProjects(repo.Owner)
	if err != nil {
		return "", fmt.Errorf("failed to list projects: %w", err)
	}
	if len(projects) == 0 {
		return "", fmt.Errorf("no projects found in organization %q", repo.Owner)
	}
	p := prompter.New(in, out, errOut)
	selected, err := p.Select(
		"Select a project",
		"",
		lo.Map(projects, func(p github.Project, _ int) string {
			return fmt.Sprintf("#%d %s", p.Number, p.Title)
		}),
	)
	if err != nil {
		return "", fmt.Errorf("failed to prompt for project: %w", err)
	}
	selectedProject := projects[selected]
	q.Set("project_id", selectedProject.ID)

	return u + "?" + q.Encode(), nil
}

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
	return cmd.Start()
}
