import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGuideContext, requestGuideProposal, validateGuideProposal} from '../ai-guide.mjs';

const context = normalizeGuideContext({
  page: {id: 'page-1', slug: 'homepage', title: 'Homepage', route: '/', sections: [
    {id: 'section-one', type: 'text', title: 'Intro', layout: 'stack', columns: 1, components: [{id: 'heading-one', type: 'heading', label: 'Heading', text: 'Hello'}]},
    {id: 'section-two', type: 'media', title: 'Proof', layout: 'split', columns: 2, components: []},
  ]},
  availableMedia: [{id: 'media-1', url: '/api/admin/media/media-1/file', alt: 'Lighting'}, {id: 'media-2', url: '/api/admin/media/media-2/file', alt: 'Installation'}],
});

const proposal = {
  action: 'insert_section', afterSectionId: 'section-two', targetSectionId: '', afterComponentId: '',
  section: {type: 'media', eyebrow: 'PROJECTS', title: 'Recent installations', body: 'A focused selection.', buttonLabel: '', buttonUrl: '', image: '', icon: 'check', layout: 'grid', columns: 2},
  component: {type: 'gallery', label: 'Project gallery', text: '', url: '', image: '', alt: '', icon: 'check', images: ['/api/admin/media/media-1/file', '/api/admin/media/media-2/file']},
  explanation: {summary: 'Added a project gallery.', reason: 'It supports the proof section.', howToChange: 'Select the gallery or use Undo.'},
  designNotes: ['Uses the existing two-column rhythm.'],
};

test('guide proposal permits one additive gallery action using known IDs and media', () => {
  const result = validateGuideProposal(proposal, context);
  assert.equal(result.action, 'insert_section');
  assert.equal(result.afterSectionId, 'section-two');
  assert.equal(result.component.type, 'gallery');
  assert.deepEqual(result.component.images, proposal.component.images);
});

test('guide proposal rejects destructive actions and unapproved media', () => {
  assert.throws(() => validateGuideProposal({...proposal, action: 'delete_section'}, context), error => error.code === 'ai_invalid_action');
  assert.throws(() => validateGuideProposal({...proposal, component: {...proposal.component, images: [...proposal.component.images, 'https://example.com/invented.jpg']}}, context), error => error.code === 'ai_unapproved_media');
});

test('guide request uses strict structured output and validates its response', async () => {
  let requestBody;
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({output: [{content: [{type: 'output_text', text: JSON.stringify(proposal)}]}]}), {status: 200, headers: {'Content-Type': 'application/json'}});
  };
  const result = await requestGuideProposal({context, language: 'el', apiKey: 'test-key', model: 'test-model', fetchImpl});
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.text.format.type, 'json_schema');
  assert.equal(requestBody.text.format.strict, true);
  assert.match(requestBody.input, /Explanation language: Greek/);
  assert.equal(result.proposal.action, 'insert_section');
});
