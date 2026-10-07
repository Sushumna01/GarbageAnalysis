const categories = {
    cardboard: {
        label: "Cardboard",
        guidance: "Keep cardboard clean and dry, flatten it, and place it with paper recycling. Remove plastic wrap and food residue.",
    },
    glass: {
        label: "Glass",
        guidance: "Empty and rinse glass containers. Separate broken glass and follow your local collection rules; not all glass products belong in container recycling.",
    },
    metal: {
        label: "Metal",
        guidance: "Empty and rinse metal cans and containers. Keep batteries and pressurized or chemical containers out of regular recycling.",
    },
    organic: {
        label: "Organic waste",
        guidance: "Put food scraps and suitable garden waste in a local compost or organic-waste collection. Keep plastic packaging out.",
    },
    paper: {
        label: "Paper",
        guidance: "Keep paper clean and dry and place it in paper recycling. Greasy or food-soiled paper may need compost or general waste handling under local rules.",
    },
    plastic: {
        label: "Plastic",
        guidance: "Empty and rinse the item, then check its resin type and local recycling rules. Keep plastic bags and film out of curbside bins unless accepted locally.",
    },
    other: {
        label: "Other / general waste",
        guidance: "This item does not match a supported recyclable category. Check local disposal guidance; keep batteries, electronics, chemicals, and medical waste in their designated collection streams.",
    },
};

module.exports = categories;
