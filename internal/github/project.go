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

// ListOrgProjects fetches all ProjectV2 projects for the given organization
// using the GitHub GraphQL API via gh CLI authentication.
func (pg *ProjectGateway) ListOrgProjects(org string) ([]Project, error) {
	var projects []Project
	var endCursor string
	hasNextPage := true

	for hasNextPage {
		var query string
		variables := map[string]interface{}{
			"owner": org,
			"first": 100,
		}
		if endCursor != "" {
			query = `
				query($owner: String!, $first: Int!, $after: String!) {
					organization(login: $owner) {
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
				query($owner: String!, $first: Int!) {
					organization(login: $owner) {
						projectsV2(first: $first) {
							nodes { id title number }
							pageInfo { hasNextPage endCursor }
						}
					}
				}
			`
		}

		var resp struct {
			Organization struct {
				ProjectsV2 struct {
					Nodes    []Project `json:"nodes"`
					PageInfo struct {
						HasNextPage bool   `json:"hasNextPage"`
						EndCursor   string `json:"endCursor"`
					} `json:"pageInfo"`
				} `json:"projectsV2"`
			} `json:"organization"`
		}

		if err := pg.client.Do(query, variables, &resp); err != nil {
			return nil, fmt.Errorf("failed to query projects for org %q: %w", org, err)
		}

		projects = append(projects, resp.Organization.ProjectsV2.Nodes...)
		hasNextPage = resp.Organization.ProjectsV2.PageInfo.HasNextPage
		endCursor = resp.Organization.ProjectsV2.PageInfo.EndCursor
	}

	return projects, nil
}
