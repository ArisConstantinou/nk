# Blueprint LED installation — image-generation record

## Generation method

- Mode: OpenAI Image API through the local `imagegen` skill, using `gpt-image-1.5`.
- Blueprint source of truth: `C:\Users\arz0r\Desktop\Untitled.png`.
- Workflow: generate a fixed empty-room plate, generate tightly framed full-body workers on uniform chroma magenta, remove the key locally with a hue-based alpha pass, and combine the results with deterministic SVG geometry.
- Output format: production WebP; worker files retain alpha.
- Production folder: `public/assets/generated/electrical-installation-blueprint/`.

All worker cutouts are trimmed to the visible silhouette. Their SVG image boxes share
the same contact line at `y=878`, inside the rendered floor plane rather than at the
rear wall/floor junction (`y=832`). Their entrance and exit motion is horizontal only,
so no worker can appear to float inside the wall.

Image generation establishes the realism, materials, lighting and consistent people. It does **not** establish the installation geometry. Shelf proportions, cabinet position, switch position, routes, boxes, conduits, conductor paths, aluminium profiles, LED strips and glows are editable SVG layers derived from the blueprint.

## Technical conventions

- The double switch is on the side wall to the left of the wooden structure, following the written blueprint note.
- Gang 1 controls the four short-shelf LED strips.
- Gang 2 controls the LED under the long lower shelf.
- The cabinet contains two accessible 230V-to-24V constant-voltage LED drivers.
- Mains and SELV wiring are visually and structurally separated.
- Cyprus/UK conductor colours are brown line/live, blue neutral and green/yellow protective earth.
- Low-voltage LED outputs are shown as paired red and black conductors.
- Flexible-conduit runs into the wooden shelves terminate directly in the joinery; no wall boxes are invented at shelf ends.
- Concealed routes use straight vertical and horizontal installation zones, with
  swept-radius bends only where conduit changes direction. The chase rendering uses
  layered rough masonry edges and a darker cut core rather than diagrammatic arcs.
- Back boxes and conduit are bedded with mortar using a bucket and masonry trowel.
- A cordless drill appears only at second fix, when the finished double-switch plate is closed and secured.
- During cable pulling, the worker's visible conductor tails align with the open mouth
  of the third shelf conduit at `494,431`; the worker never pulls from empty space.

References:

- Electricity Authority of Cyprus, wiring colour specification: <https://www.eac.com.cy/Lists/Tender/Attachments/2801/EAC%20SPEC%20%2014-008%20Is%204.pdf>
- Electricity Authority of Cyprus, IET/BS 7671 inspection framework: <https://www.eac.com.cy/EL/RegulatedActivities/Distribution/Associates/Pages/iet16thedition.aspx>
- Electricity Authority of Cyprus, supply and licensed-electrician information: <https://www.eac.com.cy/EN/RegulatedActivities/Distribution/ElectricitySupplyInformation/Pages/default.aspx>

The experience is explanatory presentation material, not a project-specific installation drawing, inspection record or certification.

## Normalised prompt set

All worker prompts share these constraints:

> Premium realistic architectural visualisation; same Mediterranean/Cypriot electrician, white hard hat, safety glasses, navy workwear and safety boots; diffuse room-matched daylight; complete isolated silhouette, tightly framed at a believable adult scale; perfectly uniform #FF00FF background; no logos, text, watermark, room, floor, blur, dust cloud or cropped tools.

### Empty room

> Use the blueprint only as the layout authority. Create a straight-on, wide empty Cyprus new-build room with a pale unfinished main wall, concrete floor and a shallow left side-wall return for the future double switch. Add no installation objects or workers.

### Electrician — set-out

> Show the electrician standing in side view, actively spray-marking construction set-out positions while holding a tape measure. No wall or other equipment.

### Builder — chasing

> Show one separate builder actively operating a professional dust-controlled twin-blade wall chaser. Include hard hat, goggles, ear defenders, respirator, gloves and a short extraction hose. No dust cloud or wall.

### Electrician — back boxes

> Preserve the electrician identity. Show him kneeling and bedding a UK/Cyprus two-gang metal back box with fresh mortar, steadying the box with one hand and applying mortar with a traditional masonry trowel in the other. Include a small bucket with visible wet mortar. No drill.

### Electrician — conduit

> Preserve the electrician identity. Show him crouched and bedding a short grey PVC/flexible conduit in fresh mortar with a masonry trowel. Include the mortar bucket and only a short conduit section near his hands because the complete route is SVG. No drill, screws or clips.

### Electrician — cable pull

> Preserve the electrician identity. Show a believable leaning cable-pull stance with short visible tails: brown, blue and green/yellow for the mains circuit, plus a separately grouped red-and-black 24V pair. Do not imply that mains and SELV share containment.

### Electrician — switch second fix

> Preserve the electrician identity. Show him using a compact cordless drill/driver to close and secure a finished white UK/Cyprus double-switch faceplate. This is the only generated worker asset that uses a drill. No mortar, bucket, trowel or conduit.

### Dark timber

> Generate an evenly lit, straight-on, seamless premium dark smoked-oak/black-stained-ash texture with restrained horizontal grain and satin finish. No furniture geometry, perspective, border or vignette.

### Cabinet interior

> Generate a straight-on technical cabinet interior with two ventilated 230V-to-24V LED drivers, protected terminals, cable glands, service loops and tidy trunking. Brown/blue/green-yellow enter on the separated mains side; red/black pairs leave on the 24V side. No exposed copper, brands, labels, doors, people or perspective distortion.

## Delivered production assets

```text
public/assets/generated/electrical-installation-blueprint/
  scene-base-wall.webp
  electrician-marking.webp
  builder-chasing.webp
  electrician-boxes.webp
  electrician-conduit.webp
  electrician-cables.webp
  electrician-switch.webp
  dark-oak-texture.webp
  cabinet-interior.webp
```

The worker source batch is retained under
`output/imagegen/fullscale-workers-chroma/`, and the transparent production-ready
copies are retained under `output/imagegen/fullscale-workers-final/`.
