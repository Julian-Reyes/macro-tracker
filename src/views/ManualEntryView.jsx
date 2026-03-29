import MacroRing from "../components/MacroRing";
import ItemRow from "../components/ItemRow";
import MealTypePicker from "../components/MealTypePicker";

export default function ManualEntryView({
  manualQuery,
  manualResults,
  manualSearching,
  manualItems,
  selectedFood,
  manualGrams,
  expandedManualIndex,
  selectedMealType,
  scaledFoodMacros,
  goals,
  error,
  handleManualSearch,
  selectFood,
  setSelectedFood,
  setManualResults,
  setManualQuery,
  setManualGrams,
  setExpandedManualIndex,
  setManualItems,
  setSelectedMealType,
  addManualItem,
  addManualToDaily,
  resetCapture,
}) {
  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
      <div style={{ padding: "20px" }}>
        {/* Search bar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            value={manualQuery}
            onChange={(e) => handleManualSearch(e.target.value)}
            placeholder="Search foods (e.g. chicken breast)"
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "'DM Sans',sans-serif",
              outline: "none",
            }}
          />
          <button
            onClick={resetCapture}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: "16px",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            ✕
          </button>
        </div>

        {/* Searching indicator */}
        {manualSearching && (
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              marginBottom: "16px",
              width: "100%",
              background:
                "linear-gradient(90deg, transparent, #E8C872, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        )}

        {/* Search results */}
        {manualResults.length > 0 && !selectedFood && (
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 500,
              }}
            >
              Results
            </span>
            {manualResults.map((food, i) => (
              <div
                key={i}
                onClick={() => selectFood(food)}
                style={{
                  padding: "12px 14px",
                  marginTop: "8px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#fff",
                    }}
                  >
                    {food.name}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#E8C872",
                      fontWeight: 600,
                    }}
                  >
                    {Math.round(food.per100g?.calories || food.calories)}{" "}
                    cal
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 600,
                      background:
                        food.source === "usda"
                          ? "rgba(123,224,173,0.1)"
                          : "rgba(114,180,232,0.1)",
                      color: food.source === "usda" ? "#7BE0AD" : "#72B4E8",
                      textTransform: "uppercase",
                    }}
                  >
                    {food.source === "usda" ? "USDA" : food.source === "barcode_off" ? "BARCODE" : "OFF"}
                  </span>
                  <span>
                    {Math.round(food.servingSize)}
                    {food.servingUnit} serving
                  </span>
                  <span>
                    P{" "}
                    {
                      +(food.per100g?.protein_g ?? food.protein_g).toFixed(
                        1,
                      )
                    }
                    g
                  </span>
                  <span>
                    C {+(food.per100g?.carbs_g ?? food.carbs_g).toFixed(1)}g
                  </span>
                  <span>
                    F {+(food.per100g?.fat_g ?? food.fat_g).toFixed(1)}g
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected food panel with gram input */}
        {selectedFood && scaledFoodMacros && (
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(232,200,114,0.04)",
              border: "1px solid rgba(232,200,114,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "12px",
              }}
            >
              <span
                style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}
              >
                {selectedFood.name}
              </span>
              <button
                onClick={() => {
                  setSelectedFood(null);
                  setManualResults([]);
                  setManualQuery("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>
            {/* Gram input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <label
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}
              >
                Amount:
              </label>
              <input
                type="number"
                value={manualGrams}
                onChange={(e) =>
                  setManualGrams(Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{
                  width: "80px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  textAlign: "center",
                  fontFamily: "'DM Sans',sans-serif",
                  outline: "none",
                }}
              />
              <span
                style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}
              >
                grams
              </span>
            </div>
            {/* Scaled macros */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              {[
                {
                  label: "Cal",
                  value: scaledFoodMacros.calories,
                  color: "#E8C872",
                },
                {
                  label: "Protein",
                  value: `${scaledFoodMacros.protein_g}g`,
                  color: "#7BE0AD",
                },
                {
                  label: "Carbs",
                  value: `${scaledFoodMacros.carbs_g}g`,
                  color: "#72B4E8",
                },
                {
                  label: "Fat",
                  value: `${scaledFoodMacros.fat_g}g`,
                  color: "#E87272",
                },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color }}>
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addManualItem}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #E8C872, #D4A843)",
                color: "#0C0C0E",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              + Add Item
            </button>
          </div>
        )}

        {/* Manual items list */}
        {manualItems.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 500,
              }}
            >
              Your items ({manualItems.length})
            </span>
            {manualItems.map((item, i) => (
              <ItemRow
                key={i}
                item={item}
                index={i}
                editable={true}
                expanded={expandedManualIndex === i}
                multiplier={1.0}
                onToggle={() =>
                  setExpandedManualIndex(
                    expandedManualIndex === i ? null : i,
                  )
                }
                onMultiplierChange={null}
                onRemove={() =>
                  setManualItems((prev) => prev.filter((_, j) => j !== i))
                }
              />
            ))}
            {/* Running totals — MacroRings */}
            {(() => {
              const t = manualItems.reduce(
                (acc, it) => ({
                  calories: acc.calories + it.calories,
                  protein_g: +(acc.protein_g + it.protein_g).toFixed(1),
                  carbs_g: +(acc.carbs_g + it.carbs_g).toFixed(1),
                  fat_g: +(acc.fat_g + it.fat_g).toFixed(1),
                }),
                { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
              );
              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    padding: "12px 0",
                    marginTop: "8px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <MacroRing
                    value={t.calories}
                    max={goals.calories}
                    color="#E8C872"
                    label="Calories"
                    unit="kcal"
                  />
                  <MacroRing
                    value={t.protein_g}
                    max={goals.proteinG}
                    color="#7BE0AD"
                    label="Protein"
                    unit="g"
                  />
                  <MacroRing
                    value={t.carbs_g}
                    max={goals.carbsG}
                    color="#72B4E8"
                    label="Carbs"
                    unit="g"
                  />
                  <MacroRing
                    value={t.fat_g}
                    max={goals.fatG}
                    color="#E87272"
                    label="Fat"
                    unit="g"
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* Meal type + save */}
        {manualItems.length > 0 && (
          <>
            <MealTypePicker
              value={selectedMealType}
              onChange={setSelectedMealType}
            />
            <button
              onClick={addManualToDaily}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #7BE0AD, #4CB97A)",
                color: "#0C0C0E",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "'DM Sans',sans-serif",
                marginTop: "8px",
              }}
            >
              Add to Log
            </button>
          </>
        )}

        {error && (
          <p
            style={{
              color: "#E87272",
              fontSize: "13px",
              textAlign: "center",
              marginTop: "12px",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
