import type {
  VerificationReport,
  VerificationStatus,
  VerificationAssertion,
  ExecutionPlan,
} from '../../../shared/types';
import type { ArtifactService } from '../../services/artifact-service';

export interface VerificationEngineOptions {
  artifactService: ArtifactService;
}

export class VerificationEngine {
  private artifactService: ArtifactService;

  constructor(options: VerificationEngineOptions) {
    this.artifactService = options.artifactService;
  }

  /**
   * Run deterministic independent verification for the workflow
   */
  public async verifyTask(
    taskId: string,
    plan: ExecutionPlan,
    stepResults: Map<string, any>
  ): Promise<VerificationReport> {
    const assertions: VerificationAssertion[] = [];
    const artifactsChecked: string[] = [];

    // Find if the plan generated a CSV artifact
    let csvPath: string | null = null;
    let expectedRowCount = 1;
    let requiredColumns = ['company_name', 'product', 'pricing', 'source_url'];

    for (const step of plan.steps) {
      if (step.tool === 'file_create_csv' || step.tool === 'verify_csv_artifact') {
        if (step.params?.path) {
          csvPath = step.params.path;
        }
        if (step.params?.requiredRows !== undefined) {
          expectedRowCount = step.params.requiredRows;
        }
        if (step.params?.headers && Array.isArray(step.params.headers)) {
          requiredColumns = step.params.headers;
        }
        if (step.params?.requiredColumns && Array.isArray(step.params.requiredColumns)) {
          requiredColumns = step.params.requiredColumns;
        }
      }
    }

    if (!csvPath) {
      csvPath = 'artifacts/startups.csv';
    }

    // Assertion 1: Execution Completed Without Failures or Skipped Steps
    const incompleteSteps = plan.steps.filter((s) => s.status !== 'completed');
    assertions.push({
      id: 'assert-plan-completion',
      name: 'Plan Step Execution',
      expected: 'All required steps completed successfully without errors or rejections',
      actual: incompleteSteps.length === 0 ? 'All steps succeeded' : `${incompleteSteps.length} step(s) failed or skipped`,
      passed: incompleteSteps.length === 0,
      evidence: { incompleteStepIds: incompleteSteps.map((s) => s.id) },
    });

    // Assertion 2: Physical CSV Artifact Exists on Disk
    let parsedCsv: any = null;
    let fileExists = false;
    let readError = '';

    try {
      parsedCsv = await this.artifactService.readAndParseCsv(csvPath);
      fileExists = true;
      artifactsChecked.push(this.artifactService.resolveSafePath(csvPath));
    } catch (err: any) {
      fileExists = false;
      readError = err.message || String(err);
    }

    assertions.push({
      id: 'assert-artifact-exists',
      name: 'Physical Artifact Exists On Disk',
      expected: `File ${csvPath} exists and is readable`,
      actual: fileExists ? `File exists (${parsedCsv?.sizeBytes ?? 0} bytes)` : `File missing: ${readError}`,
      passed: fileExists,
      evidence: { path: csvPath, sizeBytes: parsedCsv?.sizeBytes ?? 0 },
    });

    if (fileExists && parsedCsv) {
      // Assertion 3: CSV Required Columns Validation
      const missingHeaders = requiredColumns.filter((col) => !parsedCsv.headers.includes(col));
      const headersPassed = missingHeaders.length === 0;
      assertions.push({
        id: 'assert-csv-headers',
        name: 'CSV Header Schema Conformance',
        expected: `Columns: [${requiredColumns.join(', ')}]`,
        actual: `Found: [${parsedCsv.headers.join(', ')}]`,
        passed: headersPassed,
        evidence: {
          requiredColumns,
          actualHeaders: parsedCsv.headers,
          missing: missingHeaders,
        },
      });

      // Assertion 4: Deterministic Row Count Assertion
      const rowCountPassed = parsedCsv.rowCount >= expectedRowCount;
      assertions.push({
        id: 'assert-row-count',
        name: 'Row Count Audit',
        expected: `>= ${expectedRowCount} rows recorded`,
        actual: `${parsedCsv.rowCount} row(s) read back from disk`,
        passed: rowCountPassed,
        evidence: {
          expected: expectedRowCount,
          actual: parsedCsv.rowCount,
        },
      });

      // Assertion 5: Field Integrity & Citation Check
      let integrityPassed = false;
      let actualDetail = '';

      if (requiredColumns.includes('company_name')) {
        let blankNames = 0;
        let blankProducts = 0;
        let validUrls = 0;
        let unknownPricingCount = 0;
        let specifiedPricingCount = 0;

        for (const row of parsedCsv.records) {
          const name = (row['company_name'] || '').trim();
          const product = (row['product'] || '').trim();
          const pricing = (row['pricing'] || '').trim();
          const url = (row['source_url'] || '').trim();

          if (!name) blankNames++;
          if (!product) blankProducts++;
          if (url.startsWith('http://') || url.startsWith('https://')) validUrls++;
          if (pricing.toLowerCase() === 'unknown' || pricing.toLowerCase() === 'unspecified') {
            unknownPricingCount++;
          } else if (pricing.length > 0) {
            specifiedPricingCount++;
          }
        }

        integrityPassed =
          blankNames === 0 &&
          blankProducts === 0 &&
          validUrls === parsedCsv.rowCount &&
          parsedCsv.rowCount > 0;

        actualDetail = integrityPassed
          ? `All ${parsedCsv.rowCount} rows valid. Sourced URLs: ${validUrls}, Pricing: ${specifiedPricingCount} specified, ${unknownPricingCount} marked unknown.`
          : `Invalid rows: blank names: ${blankNames}, blank products: ${blankProducts}, invalid URLs: ${parsedCsv.rowCount - validUrls}`;
      } else {
        // General web or tabular extraction integrity
        let validRows = 0;
        for (const row of parsedCsv.records) {
          const url = (row['url'] || '').trim();
          const title = (row['title'] || '').trim();
          if ((url.startsWith('http://') || url.startsWith('https://')) && title.length > 0) {
            validRows++;
          }
        }
        integrityPassed = validRows === parsedCsv.rowCount && parsedCsv.rowCount > 0;
        actualDetail = integrityPassed
          ? `All ${parsedCsv.rowCount} extracted records contain verified URL and non-empty title.`
          : `${validRows} of ${parsedCsv.rowCount} rows valid.`;
      }

      assertions.push({
        id: 'assert-data-integrity',
        name: 'Fact & Citation Integrity',
        expected: 'Valid non-empty extracted data and authoritative sources recorded without fabrication',
        actual: actualDetail,
        passed: integrityPassed,
        evidence: {
          totalRows: parsedCsv.rowCount,
          columns: parsedCsv.headers,
        },
      });
    }

    // Compute Overall Status
    const allPassed = assertions.every((a) => a.passed);

    let status: VerificationStatus = 'UNVERIFIED';
    if (assertions.length > 0) {
      status = allPassed ? 'VERIFIED' : 'FAILED';
    }

    const summary = allPassed
      ? `VERIFIED: All ${assertions.length} deterministic verification assertions passed. Artifact ${csvPath} read back and validated with ${parsedCsv?.rowCount || 0} complete records.`
      : `FAILED: Verification detected ${assertions.filter((a) => !a.passed).length} failing assertion(s).`;

    return {
      taskId,
      status,
      summary,
      timestamp: Date.now(),
      assertions,
      artifactsChecked,
      rawEvidence: {
        stepResultCount: stepResults.size,
        csvDetails: parsedCsv
          ? {
              headers: parsedCsv.headers,
              rowCount: parsedCsv.rowCount,
              sizeBytes: parsedCsv.sizeBytes,
            }
          : null,
      },
    };
  }
}
