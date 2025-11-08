#!/usr/bin/env node

/**
 * Script to add blocking relationships between GitHub issues using GraphQL API
 *
 * Usage: node scripts/add-issue-blocking.mjs
 *
 * Requires: GH_TOKEN environment variable or gh CLI authentication
 */

import { execSync } from 'child_process';

const REPO_OWNER = 'hybrist';
const REPO_NAME = 'smappy';

/**
 * Execute a GraphQL query using gh CLI
 */
function graphql(query, variables = {}) {
  const cmd = `gh api graphql -f query='${query.replace(/'/g, "'\\''")}' ${
    Object.keys(variables).length > 0
      ? Object.entries(variables)
          .map(([k, v]) => `-F ${k}='${v}'`)
          .join(' ')
      : ''
  }`;

  const result = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(result);
}

/**
 * Get the node ID for an issue number
 */
function getIssueNodeId(issueNumber) {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          id
        }
      }
    }
  `;

  const result = graphql(query, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    number: issueNumber,
  });

  return result.data.repository.issue.id;
}

/**
 * Add a blocking relationship between two issues
 * blockingIssueId blocks blockedIssueId
 */
function addBlockingRelationship(blockedIssueId, blockingIssueId) {
  const mutation = `
    mutation($issueId: ID!, $blockingIssueId: ID!) {
      addBlockedBy(input: {issueId: $issueId, blockingIssueId: $blockingIssueId}) {
        issue {
          id
        }
        blockingIssue {
          id
        }
      }
    }
  `;

  try {
    execSync(
      `gh api graphql -f query='${mutation.replace(/'/g, "'\\''")}' -F issueId='${blockedIssueId}' -F blockingIssueId='${blockingIssueId}'`,
      { encoding: 'utf8' },
    );
    return true;
  } catch (error) {
    console.error(`Error creating blocking relationship: ${error.message}`);
    return false;
  }
}

/**
 * Define all blocking relationships
 * Format: [blockedIssue, [blockingIssues...]]
 */
const BLOCKING_RELATIONSHIPS = [
  // Bundler Integration
  [21, [20]], // Webpack plugin blocked by base types
  [22, [20]], // Vite plugin blocked by base types
  [23, [20, 21]], // Angular CLI blocked by base types + Webpack
  [24, [20, 21]], // Next.js blocked by base types + Webpack
  [25, [21, 22]], // Examples blocked by Webpack + Vite
  [26, [21, 22, 25]], // Docs blocked by Webpack + Vite + Examples

  // Query API + Dashboard
  [28, [27]], // Query functions blocked by API design
  [29, [28]], // Server exports blocked by query functions
  [31, [29, 30]], // Bundle overview blocked by exports + layout
  [32, [29, 30]], // Treemap blocked by exports + layout
  [33, [29, 30]], // Dependency graph blocked by exports + layout
  [34, [29, 30]], // Comparison view blocked by exports + layout

  // AI Suggestions
  [37, [36]], // Tree-shaking detector blocked by analyzer module
  [38, [36]], // Duplicate detector blocked by analyzer module
  [39, [36]], // Large module detector blocked by analyzer module
  [40, [36]], // Dependency analysis blocked by analyzer module
  [41, [37, 38, 39, 40]], // LLM integration blocked by all detectors
  [42, [29, 30]], // Suggestions UI blocked by exports + layout

  // Testing & Documentation
  [44, [43]], // E2E tests blocked by fixtures
  [48, [21, 22, 23, 24, 30, 31, 32, 33, 34]], // User guide blocked by plugins + dashboard
  [49, [27, 28, 29]], // API docs blocked by server functions
];

async function main() {
  console.log('🔗 Adding blocking relationships to GitHub issues...\n');

  // First, fetch all node IDs
  console.log('📋 Fetching issue node IDs...');
  const issueIds = new Map();
  const allIssueNumbers = new Set();

  for (const [blocked, blocking] of BLOCKING_RELATIONSHIPS) {
    allIssueNumbers.add(blocked);
    blocking.forEach((num) => allIssueNumbers.add(num));
  }

  for (const issueNumber of allIssueNumbers) {
    try {
      const nodeId = getIssueNodeId(issueNumber);
      issueIds.set(issueNumber, nodeId);
      console.log(`  ✓ Issue #${issueNumber}: ${nodeId}`);
    } catch (error) {
      console.error(`  ✗ Failed to get node ID for issue #${issueNumber}: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Fetched ${issueIds.size} issue node IDs\n`);

  // Now add blocking relationships
  console.log('🔗 Adding blocking relationships...\n');
  let successCount = 0;
  let failCount = 0;

  for (const [blockedIssue, blockingIssues] of BLOCKING_RELATIONSHIPS) {
    const blockedId = issueIds.get(blockedIssue);

    for (const blockingIssue of blockingIssues) {
      const blockingId = issueIds.get(blockingIssue);

      console.log(`  #${blockingIssue} blocks #${blockedIssue}...`);

      const success = addBlockingRelationship(blockedId, blockingId);

      if (success) {
        console.log(`    ✓ Added`);
        successCount++;
      } else {
        console.log(`    ✗ Failed`);
        failCount++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`\n🎉 Done!`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
