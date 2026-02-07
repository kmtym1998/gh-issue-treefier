package main

import (
	"flag"
	"fmt"
	"net"
	"net/url"
	"os"
	"os/exec"
	"runtime"

	"github.com/cli/go-gh/v2/pkg/repository"
	"github.com/kmtym1998/gh-issue-treefier/internal/server"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf("usage: gh issue-treefier <command>\n\nAvailable commands:\n  console    Start the web console")
	}

	switch os.Args[1] {
	case "console":
		return runConsole(os.Args[2:])
	default:
		return fmt.Errorf("unknown command: %s\n\nAvailable commands:\n  console    Start the web console", os.Args[1])
	}
}

func runConsole(args []string) error {
	fs := flag.NewFlagSet("console", flag.ExitOnError)
	port := fs.Int("port", 0, "Port to listen on (0 for auto)")
	if err := fs.Parse(args); err != nil {
		return err
	}

	actualPort := *port
	if actualPort == 0 {
		// Find an available port
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			return fmt.Errorf("failed to find available port: %w", err)
		}
		actualPort = listener.Addr().(*net.TCPAddr).Port
		listener.Close()
	}

	srv := server.New(actualPort)

	openURL := buildURL(actualPort)
	fmt.Printf("Starting server on http://localhost:%d\n", actualPort)

	// Open browser
	if err := openBrowser(openURL); err != nil {
		fmt.Fprintf(os.Stderr, "warning: failed to open browser: %v\n", err)
	}

	return srv.Start()
}

func buildURL(port int) string {
	u := fmt.Sprintf("http://localhost:%d", port)
	repo, err := repository.Current()
	if err != nil {
		return u
	}
	q := url.Values{}
	q.Set("owner", repo.Owner)
	q.Set("repo", repo.Name)
	return u + "?" + q.Encode()
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
