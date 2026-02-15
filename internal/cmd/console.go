package cmd

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/cli/go-gh/v2/pkg/api"
	"github.com/cli/go-gh/v2/pkg/prompter"
	"github.com/cli/go-gh/v2/pkg/repository"
	"github.com/cli/go-gh/v2/pkg/term"
	"github.com/kmtym1998/gh-issue-treefier/internal/github"
	"github.com/kmtym1998/gh-issue-treefier/internal/server"
	"github.com/kmtym1998/gh-issue-treefier/internal/util"
	"github.com/samber/lo"
	"github.com/spf13/cobra"
)

func newConsoleCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "console",
		Short: "Start the web console",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runConsole(cmd, args)
		},
	}

	cmd.Flags().Int("port", 7000, "Port to listen on")
	cmd.Flags().StringP("repo", "R", "", "Repository in OWNER/REPO format")
	cmd.Flags().StringP("project-id", "p", "", "Project ID (skips interactive selection)")
	cmd.Flags().Bool("no-browser", false, "Do not open the browser automatically")

	return cmd
}

func runConsole(cmd *cobra.Command, _ []string) error {
	port, err := cmd.Flags().GetInt("port")
	if err != nil {
		return fmt.Errorf("failed to read port flag: %w", err)
	}
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			port = p
		}
	}
	repoOverride, err := cmd.Flags().GetString("repo")
	if err != nil {
		return fmt.Errorf("failed to read repo flag: %w", err)
	}
	projectID, err := cmd.Flags().GetString("project-id")
	if err != nil {
		return fmt.Errorf("failed to read project-id flag: %w", err)
	}
	noBrowser, err := cmd.Flags().GetBool("no-browser")
	if err != nil {
		return fmt.Errorf("failed to read no-browser flag: %w", err)
	}

	ln, err := listenWithFallback(port, !cmd.Flags().Changed("port"))
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}
	actualPort := ln.Addr().(*net.TCPAddr).Port

	srv := server.New(actualPort)

	repo, err := resolveRepo(repoOverride)
	if err != nil {
		return err
	}

	openURL, err := buildURL(actualPort, repo, projectID)
	if err != nil {
		return err
	}
	fmt.Printf("Starting server on %s\n", openURL)

	if !noBrowser {
		if err := util.OpenBrowser(openURL); err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to open browser: %v\n", err)
		}
	}

	if err := srv.Start(ln); err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("server error: %w", err)
	}

	return nil
}

const maxPortFallbackAttempts = 10

// listenWithFallback は指定ポートでリッスンを試みる。
// fallback が true（--port 未指定）の場合、ポートが使用中なら port+1, port+2, ... と順に試行する。
// fallback が false（--port 明示指定）の場合、指定ポートのみを試みる。
func listenWithFallback(port int, fallback bool) (net.Listener, error) {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err == nil || !fallback {
		return ln, err
	}

	for i := 1; i < maxPortFallbackAttempts; i++ {
		ln, err = net.Listen("tcp", fmt.Sprintf(":%d", port+i))
		if err == nil {
			return ln, nil
		}
	}

	return nil, fmt.Errorf("failed to listen on ports %d-%d", port, port+maxPortFallbackAttempts-1)
}

func resolveRepo(repoOverride string) (repository.Repository, error) {
	if repoOverride == "" {
		return repository.Current()
	}
	parts := strings.Split(repoOverride, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return repository.Repository{}, fmt.Errorf("invalid repo %q, expected OWNER/REPO", repoOverride)
	}
	return repository.Repository{Owner: parts[0], Name: parts[1]}, nil
}

func buildURL(port int, repo repository.Repository, projectID string) (string, error) {
	u := fmt.Sprintf("http://localhost:%d", port)
	q := url.Values{}
	q.Set("owner", repo.Owner)

	if projectID != "" {
		q.Set("project_id", projectID)
		return u + "?" + q.Encode(), nil
	}

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
	projects, err := gw.ListRepoProjects(repo.Owner, repo.Name)
	if err != nil {
		return "", fmt.Errorf("failed to list projects: %w", err)
	}
	if len(projects) == 0 {
		return "", fmt.Errorf("no projects found in repository %s/%s", repo.Owner, repo.Name)
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
