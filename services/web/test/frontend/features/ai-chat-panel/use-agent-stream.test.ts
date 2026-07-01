import { expect } from 'chai'

describe('useAgentStream module', function () {
  it('exports useAgentStream as a function', function () {
    // Validates that the module loads without errors in the mocha/webpack harness.
    const mod = require('../../../../frontend/js/features/ide-redesign/components/ai-tutor/use-agent-stream')
    expect(mod.useAgentStream).to.be.a('function')
  })
})
