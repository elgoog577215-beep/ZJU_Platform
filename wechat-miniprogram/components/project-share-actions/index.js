Component({
  properties: {
    copy: {
      type: Object,
      value: {},
    },
  },
  methods: {
    openDetail() {
      this.triggerEvent("opendetail");
    },
    openPlaza() {
      this.triggerEvent("openplaza");
    },
  },
});
