.PHONY: dashboard

dashboard:
	npx -y @pimzino/spec-workflow-mcp@latest $(shell pwd) --dashboard --port 5001
