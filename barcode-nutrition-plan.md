# Future plan: more reliable barcode nutrition using free resources

Status: proposal for future implementation. Continue testing the existing barcode feature first.

## Goal

Make barcode results more reliable without paid data services or requiring users to type nutrition values manually. A barcode identifies a product record; accuracy still depends on that record matching the user's package. Free barcode databases cannot guarantee an exact label match for every product.

## Current behavior

- Barcode lookup uses Open Food Facts.
- The backend stores each result in its nutrition cache and currently returns cached records without an expiration.
- The app scales per-100-g values to the selected weight and rounds the displayed result.

Observed discrepancy for Negresco, barcode `7891000290026`, at 30 g:

| Nutrient | App | Package label reported during testing |
| --- | ---: | ---: |
| Calories | 145 kcal | 152 kcal |
| Protein | 1.7 g | 1.1 g |
| Carbohydrates | 20 g | 20 g |
| Fat | 6.4 g | 7.3 g |

The cause has not been confirmed against the source record. Possible causes include an incorrect or outdated database entry or an older cached result.

## Proposed approach

1. Keep Open Food Facts as the free barcode lookup source. Prefer manufacturer-contributed records when their provenance is available and the barcode and market match. Investigate free manufacturer data sources where practical; do not assume universal access or coverage.
2. Add a cache refresh policy. Store the fetch time, refresh records after a defined interval, and retain the source and available update metadata. A fresh record can still contain incorrect values.
3. Offer an optional **Scan nutrition label** action when a result is missing or differs from the package. Use free OCR, ideally running on the device, to extract the serving weight, calories, protein, carbohydrates, and fat. Evaluate Portuguese labels and Brazilian decimal formatting before choosing an OCR library. Avoid paid AI APIs.
4. Show the extracted values for confirmation before saving. Distinguish per-serving and per-100-g columns, grams and milliliters, and kcal and kJ. Flag unreadable or ambiguous fields rather than inventing values. Users should not need to type values in the normal flow; allow a photo retake when extraction fails.
5. Remember confirmed label values for future scans of that barcode. Initially scope these overrides to the user/device rather than treating one person's package as authoritative for everyone. Store the source, confirmation date, serving basis, and market when known. Database refreshes should not silently overwrite confirmed label values.

## Implementation order

1. Compare a sample of Brazilian barcode results with their actual package labels, including the example above. Separate stale-cache issues from source-data and scaling issues.
2. Add source metadata and cache expiration.
3. Evaluate free OCR with real iPhone photos of Portuguese nutrition labels, checking accuracy, processing time, privacy, and browser compatibility.
4. Add label capture, extraction, confirmation, and remembered values if the OCR evaluation is satisfactory.

## Validation for future implementation

- Verify both per-serving and per-100-g tables scale correctly.
- Cover decimal commas, rounded label values, multiple columns, blurry photos, and missing fields.
- Confirm remembered values take precedence over database values without being shared automatically.
- Check that the implementation introduces no paid service dependency.

## References

- [Open Food Facts data verification](https://support.openfoodfacts.org/help/en-gb/9-open-food-facts/29-is-the-information-and-data-on-products-verified)
- [Open Food Facts nutrition-label images and OCR](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorial-uploading-photo-to-a-product/)
- [GS1 links to product information](https://www.gs1.org/standards/resolver) — background on manufacturer-linked information, not a guarantee of free nutrition coverage.
