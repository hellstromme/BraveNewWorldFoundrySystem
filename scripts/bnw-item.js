class BraveNewWorldItem extends Item {
  /**
   * Provide per-type default artwork for BNW items.
   * @param {object} data     Initial data used to create the Item
   * @param {object} options  Document creation options
   * @returns {{img?: string, texture?: object}}
   */
  static getDefaultArtwork(data = {}, options = {}) {
    const art = super.getDefaultArtwork(data, options) ?? {};
    const type = data?.type ?? "";

    switch (type) {
      case "power":
        art.img = "icons/svg/explosion.svg";
        break;
      case "trick":
        art.img = "icons/svg/mystery-man.svg";
        break;
      case "quirk":
        art.img = "icons/svg/item-bag.svg";
        break;
      case "closeCombatWeapon":
        art.img = "icons/svg/sword.svg";
        break;
      case "rangedWeapon":
        art.img = "icons/svg/target.svg";
        break;
      case "armor":
        art.img = "icons/svg/shield.svg";
        break;
      case "skill":
        art.img = "icons/svg/book.svg";
        break;
      case "gear":
        art.img = "icons/svg/item-bag.svg";
        break;
      default:
        break;
    }

    return art;
  }
}

globalThis.BraveNewWorldItem = BraveNewWorldItem;
