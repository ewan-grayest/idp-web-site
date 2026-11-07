import * as migration_20261022_200610_initial from './20261022_200610_initial';
import * as migration_20261022_202442_project_page from './20261022_202442_project_page';
import * as migration_20261022_213141_team_page from './20261022_213141_team_page';
import * as migration_20261023_133245_person_page from './20261023_133245_person_page';
import * as migration_20261025_113213_i18n from './20261025_113213_i18n';
import * as migration_20261025_123453_promo_video from './20261025_123453_promo_video';
import * as migration_20261025_214945_issue_link from './20261025_214945_issue_link';
import * as migration_20261026_074330_pages_admin from './20261026_074330_pages_admin';
import * as migration_20261026_163402_hotspots_optional from './20261026_163402_hotspots_optional';
import * as migration_20261028_210247_promo_options from './20261028_210247_promo_options';
import * as migration_20261102_200136_spec_compliance from './20261102_200136_spec_compliance';
import * as migration_20261102_221628_home_show_name from './20261102_221628_home_show_name';
import * as migration_20261107_192830_personal_data_law from './20261107_192830_personal_data_law';

export const migrations = [
  {
    up: migration_20261022_200610_initial.up,
    down: migration_20261022_200610_initial.down,
    name: '20261022_200610_initial',
  },
  {
    up: migration_20261022_202442_project_page.up,
    down: migration_20261022_202442_project_page.down,
    name: '20261022_202442_project_page',
  },
  {
    up: migration_20261022_213141_team_page.up,
    down: migration_20261022_213141_team_page.down,
    name: '20261022_213141_team_page',
  },
  {
    up: migration_20261023_133245_person_page.up,
    down: migration_20261023_133245_person_page.down,
    name: '20261023_133245_person_page',
  },
  {
    up: migration_20261025_113213_i18n.up,
    down: migration_20261025_113213_i18n.down,
    name: '20261025_113213_i18n',
  },
  {
    up: migration_20261025_123453_promo_video.up,
    down: migration_20261025_123453_promo_video.down,
    name: '20261025_123453_promo_video',
  },
  {
    up: migration_20261025_214945_issue_link.up,
    down: migration_20261025_214945_issue_link.down,
    name: '20261025_214945_issue_link',
  },
  {
    up: migration_20261026_074330_pages_admin.up,
    down: migration_20261026_074330_pages_admin.down,
    name: '20261026_074330_pages_admin',
  },
  {
    up: migration_20261026_163402_hotspots_optional.up,
    down: migration_20261026_163402_hotspots_optional.down,
    name: '20261026_163402_hotspots_optional',
  },
  {
    up: migration_20261028_210247_promo_options.up,
    down: migration_20261028_210247_promo_options.down,
    name: '20261028_210247_promo_options',
  },
  {
    up: migration_20261102_200136_spec_compliance.up,
    down: migration_20261102_200136_spec_compliance.down,
    name: '20261102_200136_spec_compliance',
  },
  {
    up: migration_20261102_221628_home_show_name.up,
    down: migration_20261102_221628_home_show_name.down,
    name: '20261102_221628_home_show_name'
  },
  {
    up: migration_20261107_192830_personal_data_law.up,
    down: migration_20261107_192830_personal_data_law.down,
    name: '20261107_192830_personal_data_law'
  },
];
