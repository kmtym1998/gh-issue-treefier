package github

import (
	"fmt"
)

// GQLClient is the interface for executing GraphQL queries.
type GQLClient interface {
	Do(query string, variables map[string]interface{}, response interface{}) error
}

// Project represents a GitHub ProjectV2.
type Project struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Number int    `json:"number"`
}

// ProjectGateway provides access to GitHub Projects API.
type ProjectGateway struct {
	client GQLClient
}

// NewProjectGateway creates a new ProjectGateway with the given GraphQL client.
func NewProjectGateway(client GQLClient) *ProjectGateway {
	return &ProjectGateway{client: client}
}

// ListRepoProjects fetches all ProjectV2 projects for the given repository
// using the GitHub GraphQL API via gh CLI authentication.
func (pg *ProjectGateway) ListRepoProjects(owner, name string) ([]Project, error) {
	var projects []Project
	var endCursor string
	hasNextPage := true

	for hasNextPage {
		var query string
		variables := map[string]interface{}{
			"owner": owner,
			"name":  name,
			"first": 100,
		}
		if endCursor != "" {
			query = `
				query($owner: String!, $name: String!, $first: Int!, $after: String!) {
					repository(owner: $owner, name: $name) {
						projectsV2(first: $first, after: $after) {
							nodes { id title number }
							pageInfo { hasNextPage endCursor }
						}
					}
				}
			`
			variables["after"] = endCursor
		} else {
			query = `
				query($owner: String!, $name: String!, $first: Int!) {
					repository(owner: $owner, name: $name) {
						projectsV2(first: $first) {
							nodes { id title number }
							pageInfo { hasNextPage endCursor }
						}
					}
				}
			`
		}

		var resp struct {
			Repository struct {
				ProjectsV2 struct {
					Nodes    []Project `json:"nodes"`
					PageInfo struct {
						HasNextPage bool   `json:"hasNextPage"`
						EndCursor   string `json:"endCursor"`
					} `json:"pageInfo"`
				} `json:"projectsV2"`
			} `json:"repository"`
		}

		if err := pg.client.Do(query, variables, &resp); err != nil {
			return nil, fmt.Errorf("failed to query projects for repo %s/%s: %w", owner, name, err)
		}

		projects = append(projects, resp.Repository.ProjectsV2.Nodes...)
		hasNextPage = resp.Repository.ProjectsV2.PageInfo.HasNextPage
		endCursor = resp.Repository.ProjectsV2.PageInfo.EndCursor
	}

	return projects, nil
}
