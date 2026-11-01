import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SigmaEvaluatorLogic } from '../src/domain/sigma/sigma-evaluator.logic.js';
import { SigmaRuleDefinition } from '../src/domain/sigma/sigma-rule.types.js';

describe('Sigma Rule Detection Engine (MESH-EPIC-06)', () => {
  const mimikatzRule: SigmaRuleDefinition = {
    id: 'tum-sig-001',
    title: 'Mimikatz LSASS Memory Dump Attempt',
    status: 'stable',
    description: 'Detects execution of Mimikatz or credential dumpers reading LSASS memory',
    level: 'critical',
    tags: ['attack.credential_access', 'attack.t1003.001'],
    logsource: { category: 'process_creation', product: 'windows' },
    detection: {
      selection: {
        'CommandLine|contains': ['sekurlsa', 'lsadump', 'mimikatz', 'logonpasswords']
      },
      filter: {
        'Image|endswith': 'authorized_backup.exe'
      },
      condition: 'selection and not filter'
    }
  };

  it('successfully detects Mimikatz execution via command-line substring matching', () => {
    const maliciousEvent = {
      Image: 'C:\\Windows\\Temp\\mimi.exe',
      CommandLine: 'mimi.exe "privilege::debug" "sekurlsa::logonpasswords" exit',
      ProcessId: 4412
    };

    const result = SigmaEvaluatorLogic.evaluate(mimikatzRule, maliciousEvent);
    assert.equal(result.matched, true);
    assert.equal(result.level, 'critical');
    assert.deepEqual(result.mitreTags, ['attack.credential_access', 'attack.t1003.001']);
  });

  it('correctly suppresses alert when process matches exclusion filter', () => {
    const backupEvent = {
      Image: 'C:\\Program Files\\Backup\\authorized_backup.exe',
      CommandLine: 'authorized_backup.exe --inspect-memory=lsadump',
      ProcessId: 1042
    };

    const result = SigmaEvaluatorLogic.evaluate(mimikatzRule, backupEvent);
    assert.equal(result.matched, false);
  });

  it('evaluates web SQL injection pattern rule correctly', () => {
    const sqliRule: SigmaRuleDefinition = {
      id: 'tum-sig-002',
      title: 'Web Application SQL Injection Union Select',
      status: 'stable',
      description: 'Detects UNION SELECT in HTTP URI or parameters',
      level: 'high',
      tags: ['attack.initial_access', 'attack.t1190'],
      logsource: { category: 'webserver' },
      detection: {
        selection: {
          'RequestUri|contains': ['union select', 'union all select', '-- -']
        },
        condition: 'selection'
      }
    };

    const attackUri = {
      RequestUri: '/api/v1/products?id=1%20UNION%20SELECT%20username,password%20FROM%20users--%20-',
      HttpMethod: 'GET',
      StatusCode: 200
    };

    const result = SigmaEvaluatorLogic.evaluate(sqliRule, attackUri);
    assert.equal(result.matched, true);
    assert.equal(result.level, 'high');
  });
});
