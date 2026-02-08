package github

import (
	"encoding/json"
	"fmt"
	"testing"
)

type mockGQLClient struct {
	responses []mockResponse
	callIndex int
}

type mockResponse struct {
	body json.RawMessage
	err  error
}

// mockGQLClient implements GQLClient for testing.
var _ GQLClient = (*mockGQLClient)(nil)

func (m *mockGQLClient) Do(query string, variables map[string]interface{}, response interface{}) error {
	if m.callIndex >= len(m.responses) {
		return fmt.Errorf("unexpected call #%d (only %d responses configured)", m.callIndex+1, len(m.responses))
	}
	r := m.responses[m.callIndex]
	m.callIndex++
	if r.err != nil {
		return r.err
	}
	return json.Unmarshal(r.body, response)
}

func TestListOrgProjects_SinglePage(t *testing.T) {
	body := []byte(`{
		"organization": {
			"projectsV2": {
				"nodes": [
					{"id": "PVT_1", "title": "Project Alpha", "number": 1},
					{"id": "PVT_2", "title": "Project Beta", "number": 2}
				],
				"pageInfo": {"hasNextPage": false, "endCursor": ""}
			}
		}
	}`)

	client := &mockGQLClient{
		responses: []mockResponse{
			{body: body},
		},
	}
	gw := NewProjectGateway(client)

	projects, err := gw.ListOrgProjects("my-org")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(projects))
	}
	if projects[0].ID != "PVT_1" || projects[0].Title != "Project Alpha" || projects[0].Number != 1 {
		t.Errorf("unexpected first project: %+v", projects[0])
	}
	if projects[1].ID != "PVT_2" || projects[1].Title != "Project Beta" || projects[1].Number != 2 {
		t.Errorf("unexpected second project: %+v", projects[1])
	}
}

func TestListOrgProjects_Pagination(t *testing.T) {
	page1 := []byte(`{
		"organization": {
			"projectsV2": {
				"nodes": [
					{"id": "PVT_1", "title": "Project 1", "number": 1}
				],
				"pageInfo": {"hasNextPage": true, "endCursor": "cursor_1"}
			}
		}
	}`)
	page2 := []byte(`{
		"organization": {
			"projectsV2": {
				"nodes": [
					{"id": "PVT_2", "title": "Project 2", "number": 2}
				],
				"pageInfo": {"hasNextPage": false, "endCursor": ""}
			}
		}
	}`)

	client := &mockGQLClient{
		responses: []mockResponse{
			{body: page1},
			{body: page2},
		},
	}
	gw := NewProjectGateway(client)

	projects, err := gw.ListOrgProjects("my-org")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(projects))
	}
	if projects[0].ID != "PVT_1" {
		t.Errorf("expected first project ID 'PVT_1', got %q", projects[0].ID)
	}
	if projects[1].ID != "PVT_2" {
		t.Errorf("expected second project ID 'PVT_2', got %q", projects[1].ID)
	}
}

func TestListOrgProjects_Empty(t *testing.T) {
	body := []byte(`{
		"organization": {
			"projectsV2": {
				"nodes": [],
				"pageInfo": {"hasNextPage": false, "endCursor": ""}
			}
		}
	}`)

	client := &mockGQLClient{
		responses: []mockResponse{
			{body: body},
		},
	}
	gw := NewProjectGateway(client)

	projects, err := gw.ListOrgProjects("empty-org")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(projects) != 0 {
		t.Fatalf("expected 0 projects, got %d", len(projects))
	}
}

func TestListOrgProjects_Error(t *testing.T) {
	client := &mockGQLClient{
		responses: []mockResponse{
			{err: fmt.Errorf("GraphQL error: could not resolve to an Organization")},
		},
	}
	gw := NewProjectGateway(client)

	_, err := gw.ListOrgProjects("bad-org")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
